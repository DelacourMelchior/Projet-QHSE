# Outil 3.4 « Réceptions » : liste exhaustive des améliorations

Audit du 2026-10-06 sur la version construite et corrigée le même jour (phase 2 terminée, relue, corrigée). Rien n'est corrigé par cette liste : elle est la liste. Notation : **[gravité · effort]** avec gravité BLOQUANT, MAJEUR, MINEUR, CONFORT et effort S (moins d'une heure), M (moins d'une journée), L (plus). Les identifiants (D-1, S-7, G-2…) renvoient au rapport du module (préfixe : D domaine, E écrans, S enregistrement et sécurité, P impression, G signatures et preuves, X exemples et migration, L liens, A accessibilité et textes, F performance, T tests), dans `scratchpad/audit/` (voir §4).

---

## 0. Verdict du chef d'orchestre

**Non validé.** Le socle est sain (domaine pur, dates sûres, aucun montant, aucune XSS, liens branchés, exemple complet) mais quatre défauts de fond empêchent de dire « parfait » :

1. **Le PV signé peut être réécrit sans trace, alors qu'il dit le contraire.** Le verrou ne couvre que la réception : client, n° de commande, livrable, quantité, date promise, exigences et bornes des jalons restent modifiables après signature, sans une ligne de journal (D-1/G-1, prouvé dans le navigateur : journal 14 → 14 lignes, PV réimprimé avec les nouvelles valeurs). Une modification dans `localStorage` ou dans un .json restauré passe aussi sans trace (G-2). Et le PV écrit « aucune modification n'est possible » (G-4). C'est une preuve falsifiable présentée comme inviolable.
2. **Deux pertes de données dans l'usage courant.** (a) La fiche restée ouverte derrière le plein écran efface, à son prochain brouillon, ce que le plein écran a écrit : nom et fonction du réceptionnaire, « sans objet » des jalons (S-1/A-1, prouvé). (b) Navigateur plein : la réception plein écran affiche « Signé par… » et ne garde rien, l'alerte est cachée derrière l'écran (S-2, prouvé). S'y ajoutent la quantité « 1 250 » lue comme vide chez le client (T-5/S-15), et la remise à zéro silencieuse de modifications de l'utilisateur par la mise à niveau de l'ancienne démo (X-1) et la reprise des anciens classeurs (X-3).
3. **Le terrain n'est pas encore servi.** À 320 et 375 px la file « À faire » est illisible (texte écrasé à 19-76 px, E-1) ; dans le plein écran jalon, le bouton toujours visible est « Suivant », pas la réponse : « Conforme » est à 224 px de défilement, 740 px avec une photo de référence (E-2) ; la tâche la plus pressante (« Lever la réserve ») arrive 4 écrans au-dessus de son bouton (E-4) ; on ne peut pas imprimer un PV à signer depuis le navigateur ni remettre une copie au client après la signature (P-4, P-5).
4. **Plusieurs appareils : un PV signé se perd.** Fusion de sauvegarde, dossier partagé, numéros de PV : un PV signé sur un appareil est ignoré, écrasé ou numéroté en double (S-3 à S-6, G-3, G-13). C'est le chantier de l'hébergement en ligne (lot 7), pas un correctif local.

**Comment ce verdict a été établi.** Dix auditeurs en lecture seule (un par module) ont lu tout le code de 3.4 et de ses liens et l'ont fait tourner : scripts jetables sur les modules du dépôt, vrai Chromium sans interface à 320, 375, 768 et 1 280 px et en 812×375 (captures, arbre d'accessibilité, 99 paires de contrastes calculées, 66 PDF imprimés pour les 14 commandes d'exemple), 65 mutations à la main sur la logique, 4 360 cas de dates sur 10 fuseaux, 3 278 jours d'exemple balayés. Les rapports contiennent 204 constats, tous distingués PROUVÉ ou HYPOTHÈSE. J'ai relu les cinq rapports de fond et vérifié moi-même dans le code les affirmations les plus lourdes (`takeLife` ne protège que `reception`, deux fonctions `num` différentes pour la quantité, `go()` qui ouvre le plein écran sans fermer la fiche, test daté en dur sur 2026). Tout est exact. Après fusion des doublons (§3), restent environ 165 points distincts.

**Réserves que je maintiens (non prouvé, à vérifier avant de dire « parfait »).**
- Aucun test sur appareil réel : gants, Safari et Chrome sur iPhone et Android, AirPrint, impression sous Firefox, lecteur d'écran réel, soleil, réseau 4G, scan du QR au papier.
- Le dossier partagé n'a été simulé que par OPFS ; la portée juridique du PV et les durées de conservation (RGPD) sont à faire valider par un juriste, pas par l'outil.
- Une autre session a modifié `store/flat.ts`, `StoreContext`, `folder.ts`, `migrate.ts`, `SettingsData` et `App` pendant l'audit : les auditeurs ont relu et relancé leurs sondes sur le code de 19:49, tout tient, mais ces fichiers sont partagés et bougent encore.
- Les mesures de performance (M9) viennent d'un Chromium sans interface avec CPU ralenti ×6, pas d'une vraie tablette.

---

## 1. Ordre de traitement proposé

| Lot | Contenu | Pourquoi dans cet ordre |
|---|---|---|
| **0. Plus aucune perte de données** | 17 points (S-1, S-2, S-7 à S-12, S-14, S-15, S-17, X-1 à X-3, D-10, D-19, T-5) | Un outil qui perd en silence perd la confiance. À faire AVANT toute démonstration chez un prospect. |
| **1. Preuve intacte** | verrou complet, scellé, PV non signable vide, journal qui ne perd rien (G-1 à G-20, D-1, D-2, D-5, D-7, D-11 à D-13, D-22, D-23) | Le PV est le livrable de l'outil. Tant qu'il peut être réécrit sans trace, l'outil ne prouve rien. |
| **2. Règles justes** | quantités, états, tuiles, tâches, échéances (D-3 à D-9, D-14 à D-17, D-20, D-21, L-1, L-5, L-8, L-9) | Les chiffres et les alertes doivent dire vrai et se recouper. |
| **4. Opérateur au poste** | file lisible à 320 px, verdict sans défilement, plein écran sous la fiche, signature accessible (E-1 à E-20, A-1 à A-3, A-9) | L'usage réel : une main, des gants, chez le client. |
| **3. Le PV et la fiche sur papier** | photos et signatures dans le PDF, caractères, pagination, copie remise au client (P-1 à P-22) | Ce que le client emporte. |
| **5. Liens** | client, annuaire, défaut supprimé, date promise (L-2 à L-22) | La cohérence entre outils. |
| **6. Exemples et migration** | empreinte de renouvellement, retrait propre, histoires cohérentes (X-4 à X-20) | La démonstration au prospect. |
| **8. Accessibilité et textes** | pluriels, « (s) », consignes déguisées, nom des boutons, contrastes (A-4 à A-21) | Règles du propriétaire sur les textes. |
| **9. Tests, performance, qualité** | tests des écrans, mutants survivants, date de 2027, couplage 3.3, rendu à l'échelle (T-1 à T-17, F-2 à F-5, F-7, D-18) | Pour que les lots précédents ne régressent pas. |
| **7. Hébergement et global** | fusion multi-appareils, numéros de PV, RGPD, `common.tsx`, adresses `__proto__` des autres outils, coût de chaque écriture et quota de 5 Mo (F-1, F-6, F-8, S-21) | Dépend du choix d'hébergement et touche 3.2 et 3.3 : à traiter une fois, pour les trois outils. |

(L'ordre numérique des lots suit les rapports ; l'ordre d'exécution recommandé est celui du tableau.)

**Lot 0, en une phrase par point.** S-1/A-1 : la fiche derrière le plein écran écrase le réceptionnaire et le « sans objet » ; S-2 : stockage plein = réception « signée » mais rien de gardé et alerte invisible ; S-7 : réserve tapée mais pas ajoutée, plein écran rafraîchi, signature dessinée puis croix : tout part sans question ; S-8 : la sauvegarde .json échoue sans message au-delà de ~400 Mo de photos ; S-9 : archiver une commande avec une réserve ouverte la sort du suivi sans le dire ; S-10/X-2 : « Voir un exemple traité » allume la clause de retenue d'une entreprise réelle et « Retirer l'exemple » laisse 8 organisations et 8 contacts fictifs ; S-11/D-19 : une commande abîmée fait planter l'outil ; S-12 : un `ncId` égal à `constructor` fait planter 3.4 ; S-14 : taper un motif qui commence par « Autre » fait disparaître la ligne ; S-15/T-5 : « 1 250 » devient « tout le reste » ; S-17 : adresse e-mail saisie recopiée sans encodage dans un `mailto:` ; X-1 : la mise à niveau de l'ancienne démo efface des modifications ; X-3 : reprendre deux fois les anciens classeurs écrase le travail fait ; D-10 : champs de vie traités comme du contenu.

---

## 2. Les décisions que seul le propriétaire peut prendre

1. **Scellé d'intégrité du PV (G-2).** Sceau SHA-256 du contenu à la signature, imprimé sur l'écran, le PDF et le dossier de preuve, recalculé à l'ouverture (une modification hors interface devient visible), plus chaînage du journal. Faisable sans serveur et sans export ; la vraie parade (date et identité serveur) vient avec l'hébergement. Recommandation : le faire dans le lot 1.
2. **Faire signer un PV non libéré, vide ou contradictoire (D-7, G-5).** Recommandation : refuser la signature tant que rien n'est libéré et contrôlé, sauf dérogation motivée (qui, pourquoi), ou seulement le dire en fait ? C'est la clause 8.6 de la norme.
3. **Qui peut libérer et déroger (G-14).** Aujourd'hui tout le monde, y compris la personne qui a contrôlé et dérogé : accepter, ou imposer une seconde personne pour les jalons critiques ?
4. **Ce que le client voit avant de signer (G-7).** Recommandation : l'étape « Signatures » affiche d'abord le résultat, les réserves et la quantité (le PV existe déjà à l'écran) ; confirmer.
5. **Copie remise au client sur place (P-5).** Recommandation : bouton « Imprimer / PDF » à l'étape 6 (aucun export nouveau). L'envoi par e-mail reste l'option C12, non faite.
6. **Données personnelles (G-16, lot 7).** Durée de conservation des signatures et des noms, effacement, anonymisation qui garde la preuve : à faire valider par un juriste ; aucun code avant cette réponse.
7. **Pourcentage de retenue par commande.** Déjà tranché (mention de clause dans les réglages, pas de saisie par commande) : l'exemple affichait pourtant 10 % ; à confirmer que l'on retire ce cas de l'exemple (X-13) plutôt que d'ajouter le champ.
8. **Réserve bloquante.** Le PV dit « Réception reportée » et la quantité n'est pas comptée reçue : confirmer que c'est bien le sens voulu (D-4, L-8).
9. **Chantiers globaux (lot 7).** `common.tsx` (12 px au toucher, `Chips` à 26 px, `Modal` sans nom accessible ni focus), adresses `__proto__` de 6 outils, fusion multi-appareils : un lot commun aux trois outils, quand ?

---

## 3. Doublons fusionnés (même cause dite par plusieurs auditeurs)

D-1 = G-1 (verrou incomplet) · D-7 = G-5 (signer sans libération) · D-2 = L-6 = G-12 (jalon masqué sans trace) · D-19 = S-11 = X-15 (commande abîmée) · S-9 = L-13 (archive avec réserves) · S-15 = T-5 (quantité) · S-1 = A-1 (fiche derrière le plein écran : z-index et `go()`) · S-6 = G-13 (numéro de PV) · S-10 = X-2 (retrait de l'exemple) · S-13 = P-14 (QR avec la chaîne de requête) · S-16 = P-10 (mot trop long du PDF) · D-23 = G-9 (horloge) · P-11 = A-15 (PV dit autrement dans trois sorties) · S-12 = L-7 (clés égales à des noms de `Object.prototype` : le cas 3.4 au lot 0, les 6 autres outils au lot 7). Chaque doublon est rangé dans le lot où sa correction se fait.

---

## 4. Les listes détaillées par lot

### Lot 0. Plus aucune perte de données

2 bloquant · 8 majeur · 7 mineur · 0 confort (17 points).

- **S-1 [BLOQUANT · S] FAIT le 2026-10-07.** La fiche restée ouverte sous un plein écran efface ce que le plein écran a écrit : nom et fonction de la personne qui réceptionne, « sans objet » des jalons. *Fait :* la fiche tient la base de sa copie tapée (`takeLife(into, from, base)`), enregistre puis se ferme avant d'ouvrir un plein écran ; une seule fenêtre à la fois (vérifié dans le navigateur).
- **S-2 [BLOQUANT · S] FAIT le 2026-10-07.** Navigateur plein : la réception plein écran affiche « Signé par Mme Perrin » et ne garde rien ; l'alerte est cachée derrière l'écran ; le pied de la fiche dit toujours « Enregistré automatiquement ». *Fait :* les deux plein-écrans affichent eux-mêmes l'échec d'écriture en rouge, plus de « Signé par… » ni « PV terminé » quand rien n'est gardé ; le pied de la fiche passe au rouge.
- **S-7 [MAJEUR · S] FAIT le 2026-10-07.** Brouillons perdus sans confirmation : fermeture de la fiche, fermeture ou rafraîchissement du plein écran. *Fait :* fermeture avec saisie en attente : fenêtre qui nomme ce qui serait perdu (fiche et plein-écrans), `beforeunload` et brouillon en `sessionStorage` au plein écran. Reste : rafraîchissement de la fiche avec une réserve en cours de saisie.
- **S-8 [MAJEUR · M] FAIT le 2026-10-07.** La sauvegarde .json échoue sans message au-delà de ~400 Mo de photos, et omet sans le dire les photos absentes de cet ordinateur. *Fait :* sauvegarde en plusieurs fichiers de 100 Mo de photos ou sans les photos, message en fait ; les fichiers de photos se restaurent.
- **S-9 [MAJEUR · S] FAIT le 2026-10-07.** Archiver une commande qui a des réserves ouvertes les sort du suivi, sans le dire. *Fait :* une commande archivée garde ses tâches de levée et ses compteurs de réserves ; filtre « Réserves » et fenêtre d'archivage le disent.
- **S-10 [MAJEUR · S] FAIT le 2026-10-07.** « Retirer l'exemple » laisse 8 organisations fictives, 8 contacts fictifs dans l'annuaire et la clause de retenue activée. *Fait :* « Voir un exemple traité » ne touche plus aux réglages d'une vraie entreprise ; « Retirer l'exemple » retire aussi organisations, contacts et clause d'exemple, et s'annule.
- **T-5 [MAJEUR · S] FAIT le 2026-10-07.** La saisie d'une quantité est lue par deux fonctions différentes, et « 1 250 » efface la quantité chez le client. *Fait :* voir S-15.
- **X-1 [MAJEUR · S] FAIT le 2026-10-07.** Le renouvellement efface des modifications faites dans l'ancienne démo : l'empreinte `fp` ne lit pas la moitié des champs. *Fait :* la mise à niveau de l'ancienne démo compare la commande entière à l'ancien exemple ; une commande modifiée garde tout.
- **X-2 [MAJEUR · S] FAIT le 2026-10-07.** « Voir un exemple traité » allume la clause de retenue de l'entreprise, et « Retirer l'exemple » ne l'éteint pas. *Fait :* voir S-10.
- **X-3 [MAJEUR · S] FAIT le 2026-10-07.** Reprendre deux fois les anciens classeurs écrase le travail fait sur les commandes importées, malgré « rien n'est effacé ». *Fait :* reprendre deux fois les anciens classeurs ne réécrit plus une commande déjà reprise et le dit.
- **D-10 [MINEUR · S] FAIT le 2026-10-07.** `takeLife` : des champs écrits par la vie sont traités comme du contenu, donc un écran périmé les écrase. *Fait :* une copie tapée n'écrase que les champs qu'elle a changés.
- **D-19 [MINEUR · S] FAIT le 2026-10-07.** `upgradeDelivery` plante sur une commande abîmée et `normalize` n'a pas de garde : tout le fichier devient « illisible ». *Fait :* voir S-11.
- **S-11 [MINEUR · S] FAIT le 2026-10-07.** Un enregistrement sans `milestones` ou sans `reception` est gardé tel quel et fait planter l'écran 3.4. *Fait :* `upgradeDelivery` tolère toute commande abîmée (jamais d'exception).
- **S-12 [MINEUR · S] FAIT le 2026-10-07.** Ids égaux à des noms de `Object.prototype` : une valeur `ncId: 'constructor'` plante tout l'outil ; adresses de quatre outils voisins plantent. *Fait :* `Object.hasOwn` dans toutes les lectures par id de 3.4.
- **S-14 [MINEUR · S] FAIT le 2026-10-07.** Réglages : taper un motif ou une suite qui commence par « Autre » fait disparaître la ligne et déplace la frappe sur la voisine. *Fait :* taper « Autre site » dans les réglages garde la ligne.
- **S-15 [MINEUR · S] FAIT le 2026-10-07.** Quantités : un texte non numérique efface la valeur au plein écran et est ignoré sans message dans la fiche. *Fait :* `parseQty` unique : « 1 250 » donne 1250, un texte invalide est dit et conservé sans rien écrire.
- **S-17 [MINEUR · S] FAIT le 2026-10-07.** `mailto:` construit avec l'adresse saisie sans encodage. *Fait :* adresse e-mail validée et encodée avant tout `mailto:` de 2.3 et 2.4 (restent deux `mailto:` hors 3.4 : `ReflexCard.tsx` et `ClaimSheet.tsx`, lot 7).

### Lot 1. Preuve intacte : le PV signé dit vrai et ne se réécrit pas

5 bloquant · 14 majeur · 8 mineur · 0 confort (27 points).

- **D-1 [BLOQUANT · M] FAIT le 2026-10-07.** Un PV signé reste réécrivable : client, n°, livrable, quantité commandée, date promise et définitions des jalons (exigence, mini, maxi), sans ligne de journal. *Fait :* `takeLife` rend la commande enregistrée entière quand le PV est verrouillé ; champs de la commande et définitions de jalons désactivés ; « Corriger la commande » et « Corriger la définition » (personne + motif) passent par `correctLocked`, journal PROOF, nouveau scellé.
- **D-2 [BLOQUANT · S] FAIT le 2026-10-07.** Un jalon non conforme se masque sans trace : « Sans objet » (sans nom, sans journal) ou « Retirer » puis libération sans dérogation. *Fait :* « sans objet » et retrait d'un jalon demandent personne et motif et laissent une ligne PROOF ; refusé pour un jalon non conforme non dérogé.
- **G-1 [BLOQUANT · M] FAIT le 2026-10-07.** Le verrou ne couvre pas ce que le PV imprime : commande, exigences, bornes, date promise restent modifiables après la signature, sans une ligne de journal. *Fait :* voir D-1.
- **G-2 [BLOQUANT · M] FAIT le 2026-10-07.** Aucune intégrité vérifiable : toute modification hors de l'interface (console, `localStorage`, « Restaurer une sauvegarde », fichier .json édité) est acceptée sans trace et sans détection. *Fait :* scellé SHA-256 (`sha256.ts`, `sealOf`, `sealState`) posé à la signature et après chaque correction ; imprimé sur l'écran, le PV, le PDF et le dossier de preuve ; une modification de `localStorage` s'affiche « Modifié depuis la signature » (vérifié dans le navigateur). Reste : chaînage du journal global (attend l'hébergement).
- **G-4 [BLOQUANT · S] FAIT le 2026-10-07.** Des affirmations fausses ou excessives sont écrites sur le PV et à l'écran, contre la règle « l'outil n'affirme aucun effet juridique ». *Fait :* plus aucune affirmation « aucune modification n'est possible », « contradictoire », « réceptionnaire habilité » ; le PV dit ce qu'il sait.
- **D-5 [MAJEUR · S] FAIT le 2026-10-07.** L'échéance de levée est relue en direct dans les réglages : modifier « délai de levée » réécrit les PV signés, les retards et l'indicateur d'hier. *Fait :* l'échéance de levée est écrite à la création de la réserve ; changer les réglages ne réécrit plus un PV signé ; repousser une échéance demande un motif.
- **D-7 [MAJEUR · S] FAIT le 2026-10-07.** Livraison sans libération, ou libération après la livraison : aucun fait nulle part, état vert, indicateur à 100 %. *Fait :* « livrée sans libération » et « libérée après la livraison » dits en faits (insights, badge) ; signature refusée sans libération sauf dérogation motivée.
- **G-5 [MAJEUR · S] FAIT le 2026-10-07.** On peut faire signer, et verrouiller, un PV vide, non libéré ou contradictoire ; la libération avant livraison (ISO 8.6) n'est qu'un fait affiché. *Fait :* voir D-7 (`signBlockers`, `signWaiver`).
- **G-6 [MAJEUR · S] FAIT le 2026-10-07.** Le trait de signature n'est lié à rien et n'a aucun seuil : un point suffit, une signature se rejoue, elle se remplace sans trace. *Fait :* un tracé trop court est refusé (`signatureOk`) et une signature identique à celle d'un autre PV aussi (`signatureReuse`).
- **G-7 [MAJEUR · S] FAIT le 2026-10-07.** Le client signe sans avoir sous les yeux ce qu'il signe. *Fait :* l'étape « Signatures » affiche d'abord le contenu du PV (résultat, réserves, quantité, clause).
- **G-8 [MAJEUR · M] FAIT le 2026-10-07.** L'identité est déclarée, pas prouvée, et l'outil ne dit pas laquelle il enregistre : « qui » vaut parfois personne, parfois le client. *Fait :* voir D-11. Reste : champ « pour » (qui a attesté) non fait.
- **G-9 [MAJEUR · M] FAIT le 2026-10-07.** L'heure d'une signature est celle de l'horloge de l'appareil, sans contrôle, sans mention, sans fuseau. *Fait :* `clockFact` : une horloge antérieure au dernier acte bloque libération et signature (hors dérogation de signature) ; reste l'instant en UTC avec secondes.
- **G-10 [MAJEUR · S] FAIT le 2026-10-07.** La levée de réserve sans le client n'a aucune preuve exigée, sa date est libre (même future) et l'échéance se repousse sans motif. *Fait :* levée : instant du geste (plus de champ date), photo ou note exigée sans client, « levée enregistrée par X ».
- **G-11 [MAJEUR · S] FAIT le 2026-10-07.** La preuve de la signature entreprise et des corrections vit dans un journal coupé à 300 lignes ; au-delà, le PV nomme un autre signataire. *Fait :* voir D-13.
- **G-12 [MAJEUR · S] FAIT le 2026-10-07.** Des gestes qui changent la preuve ne laissent aucune ligne : structure des jalons, « sans objet », photos, quantités. *Fait :* gestes de structure, quantités, comptage et photos d'état journalisés (`setQuantities`, `setStatePhotos`).
- **G-14 [MAJEUR · S] FAIT le 2026-10-07.** Autorisation de libérer et dérogation : consultatives, auto-attribuées, sans exigence de fond. *Fait :* `derogationFacts` dits sur l'écran et le PV (même personne qui a contrôlé et dérogé).
- **G-15 [MAJEUR · M] FAIT le 2026-10-07.** La photo du PV papier verrouille le PV sans rien prouver ; aucune photo n'a de date de prise ; une même photo sert plusieurs PV. *Fait :* photo du PV papier : personne exigée, instant `pvPhotoAt`, réutilisation de la même photo refusée.
- **G-18 [MAJEUR · S] FAIT le 2026-10-07.** Les indicateurs envoyés au tableau de pilotage se gonflent par les mêmes failles. *Fait :* `recep_clean` ne compte que les PV signés ; `recep_released` lit la dérogation de chaque livraison.
- **L-6 [MAJEUR · S] FAIT le 2026-10-07.** Retirer un jalon non conforme qui a un défaut sans décision rend la commande libérable sans dérogation, et ne laisse aucune trace. *Fait :* voir D-2.
- **D-11 [MINEUR · S] FAIT le 2026-10-07.** Les règles de preuve vivent dans l'écran, pas dans le domaine. *Fait :* une personne est exigée pour chaque geste de preuve.
- **D-12 [MINEUR · S] FAIT le 2026-10-07.** `correctLocked` fabrique des états incohérents. *Fait :* `correctLocked` refuse les corrections incohérentes (résultat, réserves, montant).
- **D-13 [MINEUR · S] FAIT le 2026-10-07.** Journal plafonné à 300 lignes : les plus anciennes partent sans marque, signature et corrections comprises. *Fait :* les lignes PROOF du journal ne sont jamais élaguées par le plafond de 300 lignes.
- **D-22 [MINEUR · S] FAIT le 2026-10-07.** Gestes rejouables non idempotents. *Fait :* gestes rejouables idempotents.
- **D-23 [MINEUR · M] FAIT le 2026-10-07.** Horodatage « au doigt » sans fuseau. *Fait :* fuseau de la signature (`signTz`) enregistré et imprimé.
- **G-19 [MINEUR · M] FAIT le 2026-10-07.** « Le PV tel que signé » n'est pas reproductible. *Fait :* l'événement de contrôle garde l'exigence, les bornes et l'instrument d'alors ; « Levées après la signature » en bloc à part sur le PV.
- **G-20 [MINEUR · S] FAIT le 2026-10-07.** Le témoin d'un « client absent » ou d'une « signature refusée » n'est pas indépendant. *Fait :* témoin jamais la personne qui remet, organisation demandée.
- **P-18 [MINEUR · S] FAIT le 2026-10-07.** PV papier photographié : pas de date de signature. *Fait :* la photo du PV papier porte sa date et son heure.

### Lot 2. Règles justes : états, quantités, chiffres, échéances

0 bloquant · 7 majeur · 8 mineur · 1 confort (16 points).

- **D-3 [MAJEUR · S] FAIT le 2026-10-07.** Quantités décimales : l'arithmétique flottante laisse « 1,1e-16 à livrer » et la commande n'est jamais soldée. *Fait :* quantités comptées sans flottants parasites (arrondi à 6 chiffres), virgule française lue et écrite.
- **D-4 [MAJEUR · S] FAIT le 2026-10-07.** Des réserves ouvertes survivent à un changement de résultat ou à un refus, d'où des chiffres qui se contredisent. *Fait :* « sans réserve » refusé tant qu'une réserve est ouverte ; les réserves d'une livraison refusée ne sont plus suivies ; une réserve exige une livraison commencée.
- **D-6 [MAJEUR · S] FAIT le 2026-10-07.** Le PV non signé d'une livraison close disparaît de la file et ne peut plus jamais être signé. *Fait :* la livraison suivante n'est pas ouverte tant que le PV de la livraison reçue n'est pas signé (ou dérogation).
- **D-8 [MAJEUR · S] FAIT le 2026-10-07.** L'indicateur « libérées sans dérogation » est faux dès qu'une commande a plusieurs livraisons : le lot hérite de la dérogation de la livraison en cours. *Fait :* chaque lot garde sa propre dérogation dans l'indicateur « sans dérogation ».
- **D-9 [MAJEUR · S] FAIT le 2026-10-07.** Tuiles et cartes contredisent les alertes dès qu'un lot clos garde une réserve : `deliveryState` et `currentState` ne disent pas la même chose. *Fait :* tuiles, cartes, alertes, tâches et badge lisent les mêmes états ; la tuile « En cours » compte ce que son filtre contient.
- **L-1 [MAJEUR · S] FAIT le 2026-10-07.** Le lien « N réceptions (3.4) » de l'annuaire et du bilan 2.4 arrive sur une liste vide. *Fait :* le lien « N réceptions (3.4) » ouvre la liste de ce client sur le filtre qui contient ses commandes (vérifié dans le navigateur).
- **L-5 [MAJEUR · S] FAIT le 2026-10-07.** La date promise est copiée une fois du devis puis lue de trois façons contradictoires. *Fait :* une seule date promise (`promisedOn`) lue par 3.4, 2.4 et l'indicateur ; « La date promise du devis est maintenant… » en fait avec « Reprendre ».
- **D-14 [MINEUR · S] FAIT le 2026-10-07.** « Mes tâches » : le rouge passe en dernier, ids instables, un seul responsable. *Fait :* tâches rouges avec échéance (plus en dernier), ids stables, responsable = première personne présente.
- **D-15 [MINEUR · S] FAIT le 2026-10-07.** Tuile « X sur N réceptions » reconstruite depuis un pourcentage arrondi. *Fait :* la tuile « X sur N réceptions » vient de compteurs entiers (50 sur 101 se lit 50).
- **D-16 [MINEUR · S] FAIT le 2026-10-07.** Badge « Réceptions à jour » alors qu'il reste du travail ; contrôle de départ ignoré par la libération. *Fait :* le badge n'est « à jour » que s'il ne reste ni tâche ni constat (partielle, bilan, défaut sans décision, contrôle de départ).
- **D-17 [MINEUR · S] FAIT le 2026-10-07.** `recep_promised` compte une livraison refusée ou non terminée comme livrée à la date promise. *Fait :* `recep_promised` ne compte que les livraisons reçues non refusées, à la date de réception.
- **D-20 [MINEUR · S] FAIT le 2026-10-07.** Quantités : négatives acceptées, « reçu > commandé » silencieux, décimale au point, accord « restent ». *Fait :* quantité négative refusée et dite ; « N reçues pour M commandées » en fait.
- **D-21 [MINEUR · S] FAIT le 2026-10-07.** Mesures : moins typographique lu comme positif, borne sans valeur acceptée, conformité périmée si les bornes changent. *Fait :* moins typographique lu comme moins ; « conforme » sans valeur sur un jalon à bornes refusé ; « bornes modifiées depuis le contrôle » dit en fait.
- **L-8 [MINEUR · S] FAIT le 2026-10-07.** Réception reportée (réserve bloquante) : quatre lectures du même fait. *Fait :* une réception reportée n'est ni livrée, ni à demander en bilan 2.4, ni comptée comme livraison.
- **L-9 [MINEUR · S] FAIT le 2026-10-07.** « Mes tâches » : une commande = une seule personne, la première de l'équipe, même partie ou absente. *Fait :* tâche attribuée à la première personne présente de l'équipe.
- **D-24 [CONFORT · S] FAIT le 2026-10-07.** Petits défauts de cohérence. *Fait :* petits défauts de cohérence corrigés (restent : jours fériés dans les réglages, code mort `liftDue`).

### Lot 3. Le PV et la fiche sur papier

0 bloquant · 7 majeur · 11 mineur · 3 confort (21 points).

- **P-1 [MAJEUR · M] FAIT le 2026-10-07.** Le PDF du PV n'a ni les photos ni les signatures de levée et de libération, et renvoie à « la photo ». *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).
- **P-2 [MAJEUR · S] FAIT le 2026-10-07.** Le PDF remplace par « ? » tout caractère hors Latin-1, noms de personnes compris. *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).
- **P-3 [MAJEUR · M] FAIT le 2026-10-07.** Pages 2 et suivantes du PV et du dossier imprimés : ni n° de PV, ni commande, ni « page n sur N ». *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).
- **P-4 [MAJEUR · S] FAIT le 2026-10-07.** On ne peut pas imprimer un PV à signer à la main depuis le navigateur ; le PV imprimé non signé dit « Pas de signature ». *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).
- **P-5 [MAJEUR · S] FAIT le 2026-10-07.** Chez le client, après la signature, aucun moyen de lui remettre une copie. *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).
- **P-6 [MAJEUR · S] FAIT le 2026-10-07.** Des notes internes sont imprimées sur le PV remis au client, dont une qui affaiblit la clause. *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).
- **P-7 [MAJEUR · M] FAIT le 2026-10-07.** La fiche suiveuse papier se remplit à la main mais ne peut pas se reporter dans l'application. *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).
- **P-8 [MINEUR · S] FAIT le 2026-10-07.** Page presque vide en fin de PV et de dossier. *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).
- **P-9 [MINEUR · S] FAIT le 2026-10-07.** Fond bleu-gris imprimé quand « Graphiques d'arrière-plan » est coché. *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).
- **P-10 [MINEUR · S] FAIT le 2026-10-07.** PDF : un mot plus long que la ligne n'est pas coupé. *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).
- **P-11 [MINEUR · S] FAIT le 2026-10-07.** Le même fait est dit autrement dans les trois sorties. *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).
- **P-12 [MINEUR · S] FAIT le 2026-10-07.** Client ou commande sans nom : des mots génériques tiennent la place d'une donnée. *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).
- **P-13 [MINEUR · S] FAIT le 2026-10-07.** QR de 25 mm : lisible à 40 cm seulement avec une adresse courte ; zone de silence de 3 modules. *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).
- **P-15 [MINEUR · S] FAIT le 2026-10-07.** Photos du PV imprimées en 38 × 25 mm. *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).
- **P-16 [MINEUR · S] FAIT le 2026-10-07.** Impression : aucun signe pendant l'attente, et attente sans limite. *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).
- **P-17 [MINEUR · S] FAIT le 2026-10-07.** Textes et zones d'écriture de la fiche trop justes. *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).
- **P-19 [MINEUR · S] FAIT le 2026-10-07.** Signature ou case sans nom. *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).
- **S-16 [MINEUR · S] FAIT le 2026-10-07.** PDF du PV : un mot plus long que la ligne dépasse la page ; un champ ou une cellule plus haut qu'une page est coupé. *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).
- **P-20 [CONFORT · S] FAIT le 2026-10-07.** Date seule sur les copies imprimées. *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).
- **P-21 [CONFORT · S] FAIT le 2026-10-07.** Fiche suiveuse sans adresse ni contact de livraison, sans photo de référence. *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).
- **P-22 [CONFORT · S] FAIT le 2026-10-07.** Numéro de PV coupé dans le tableau du dossier. *Fait :* lot 3 : PV, PDF, fiche suiveuse (voir rapports L3-PDF et L3-PRINT).

### Lot 4. L'opérateur au poste et chez le client : écrans de terrain

0 bloquant · 8 majeur · 13 mineur · 4 confort (25 points).

- **A-1 [MAJEUR · S] FAIT le 2026-10-07.** « Contrôler en plein écran » et « Réception plein écran chez le client », dans la fiche, ouvrent l'écran DERRIÈRE la fiche. *Fait :* vérifié : un seul dialogue, plein écran au centre et focus dedans.
- **A-2 [MAJEUR · S] FAIT le 2026-10-07.** « PV signé » n'est pas annoncé au moment de la signature dans la réception plein écran, et le focus tombe sur le corps de page après chaque validation. *Fait :* focus au titre après chaque validation, région `status` : « Signature du client enregistrée, PV-… ».
- **A-3 [MAJEUR · M] FAIT le 2026-10-07.** La signature est un `canvas` sans rôle, hors tabulation, sans équivalent annoncé ; 106 px de haut dans la fiche. *Fait :* zone de signature `role="img"` nommée ; les sorties sans tracé restent « absent », « refusée » et la photo du PV papier (aucune saisie de nom ne vaut signature).
- **E-1 [MAJEUR · S] FAIT le 2026-10-07.** La file « À faire » est illisible à 320 et 375 px (texte écrasé en une colonne de 19 à 76 px). *Fait :* file « À faire » lisible à 320 px : texte sur 262 px (au lieu de 13-21), une ligne = un bouton court (« Lever », « Livrer », « Traiter »), « Voir 5 de plus », filtre « Mes tâches ».
- **E-2 [MAJEUR · M] FAIT le 2026-10-07.** Plein écran jalon et fin de contrôle : le bouton vert plein toujours visible est « Suivant » (ou « Fermer »), pas la réponse. *Fait :* « Conforme » / « Non conforme » (64 px) dans la barre fixe du bas : visibles sans défilement à 375×812 et 320×640, photo de référence comprise ; « Libérer la commande » de même.
- **E-3 [MAJEUR · M] FAIT le 2026-10-07.** Téléphone en paysage et clavier ouvert : le plein écran n'a plus de zone de travail. *Fait :* paysage et clavier : en-tête sur une ligne, photos repliées sous 500 px de haut, pied replié pendant la saisie (zone de travail 124 px au lieu de 48 avec le clavier émulé).
- **E-4 [MAJEUR · S] FAIT le 2026-10-07.** La tâche la plus pressante (« Lever la réserve », en retard) ouvre l'onglet Réception tout en haut ; le bouton « Lever la réserve » est 4 écrans plus bas. *Fait :* « Lever » depuis la file ouvre la fiche sur la réserve (anneau, bouton visible sans défilement à 320, 375 et 768 px).
- **E-5 [MAJEUR · S] FAIT le 2026-10-07.** Depuis le registre, les écrans de terrain ne s'atteignent que par une icône sans libellé, collée à deux autres. *Fait :* cartes : boutons « Contrôler » et « Réception » nommés de 44 px.
- **A-9 [MINEUR · S] FAIT le 2026-10-07.** Les groupes `role="radio"` n'ont ni flèches ni tabulation unique ; la liste des personnes de l'exemple fait 12 arrêts. *Fait :* groupes de personnes et gravité en `radiogroup` à flèches et une seule tabulation ; résultat et départ en `aria-pressed`.
- **E-6 [MINEUR · S] FAIT le 2026-10-07.** « Voir les N autres » déroule tout d'un coup, sans pagination, sans filtre « mes tâches ». *Fait :* file par paquets de 5 et filtre « Mes tâches ».
- **E-7 [MINEUR · S] FAIT le 2026-10-07.** Des règles « 44 px » ne valent que sous 640 px de large (`max-sm:` sans `pointer:coarse`) : tablette et téléphone en paysage restent à 17 px. *Fait :* plus de règle 44 px en `max-sm:` seule dans les fichiers de 3.4 ; champs à 16 px au toucher. Reste global : `Chips`, `Method`, croix de `Modal` (lot 7).
- **E-8 [MINEUR · M] FAIT le 2026-10-07.** En-tête de la fiche trop haut : l'onglet commence à 48 % de l'écran à 375 px, et à 320 px il ne reste que 79 px de contenu à l'ouverture. *Fait :* en-tête de la fiche compact : 56 % de l'écran pour le contenu à l'ouverture à 375 px (36 % avant), 43 % à 320 px (11 % avant).
- **E-9 [MINEUR · M] FAIT le 2026-10-07.** Écran principal à 375 px : le registre est à 1478 px, la première commande à 1769 px, « Nouvelle commande » à 1555 px ; le même fait est dit 3 à 4 fois. *Fait :* registre à 375 px : première commande à 995 px (1 673 avant), constats doublons repliés.
- **E-10 [MINEUR · S] FAIT le 2026-10-07.** Champ de recherche étroit, et un message faux quand la recherche ne trouve rien. *Fait :* recherche pleine largeur, message vide en fait.
- **E-11 [MINEUR · S] FAIT le 2026-10-07.** Création : les 6 modèles passent avant le client ; à 320 px le client est hors écran. *Fait :* création : client et livrable d'abord, modèle en liste, tient en moins d'un écran à 320 px.
- **E-12 [MINEUR · S] FAIT le 2026-10-07.** Réglages en bas de l'écran principal : 41 à 53 cibles sous 44 px à 375 px, 7172 px de haut avec un seul modèle copié, absents tant qu'aucune commande n'existe. *Fait :* réglages : 7 sections fermées, « Retirer » de 44 px (4 572 px au lieu de 9 743 ouverts).
- **E-13 [MINEUR · S] FAIT le 2026-10-07.** Signature : zone de 315×106 px, lien « Effacer » de 107×17 px, et un « Effacer la signature » mort après validation. *Fait :* signature : 160 px, pleine largeur, « Effacer » de 44 px absent quand il n'y a rien à effacer.
- **E-14 [MINEUR · S] FAIT le 2026-10-07.** Boutons photo à 11 px dans des écrans conçus pour les gants. *Fait :* boutons photo à 16 px au toucher dans les plein-écrans (wrapper `Snap`).
- **E-15 [MINEUR · S] FAIT le 2026-10-07.** Le chiffre de l'anneau « Fiche complète » fait 10 px. *Fait :* plus de chiffre de 10 px dans l'anneau : « 88 % » en 11 px.
- **E-16 [MINEUR · S] FAIT le 2026-10-07.** Textes en double et dates en trois formats. *Fait :* jours écrits en un seul format dans la file et les constats. Reste : textes de tâches du domaine en jj/mm/aaaa.
- **E-17 [MINEUR · S]** Retours à 11 px sur l'essentiel des cartes. *Correction :* tâche et état à 13-14 px sous 640 px.
- **E-18 [CONFORT · S] FAIT le 2026-10-07.** Qui contrôle n'est plus visible après le premier écran, et il est exigé même pour seulement libérer. *Fait :* le nom de la personne qui contrôle reste visible, une touche pour le changer.
- **E-19 [CONFORT · M]** Deux interfaces pour le même geste, dans deux ordres. *Correction :* voir le rapport M2-ecrans.md
- **E-20 [CONFORT · M] FAIT le 2026-10-07.** « Suivant » saute un jalon sans rien dire (HYPOTHÈSE sur la fréquence). *Fait :* sans objet : E-2 traité (la barre du bas porte la réponse et le saut est dit à la fin du contrôle).
- **G-21 [CONFORT · S] FAIT le 2026-10-07.** Un PV ne se retrouve pas par son numéro ni par son bon de livraison. *Fait :* la recherche trouve le n° de PV et le bon de livraison, lots compris.

### Lot 5. Liens avec les autres outils

0 bloquant · 3 majeur · 9 mineur · 3 confort (15 points).

- **L-2 [MAJEUR · S] FAIT le 2026-10-07.** Défaut supprimé en 5.1 : le jalon (ou la réserve) reste lié à une fiche introuvable pour toujours ; au plein écran, « Déclarer au bac rouge » est un bouton mort. *Fait :* lot 5 : domaine, liens et écrans faits et vérifiés en navigateur (défaut introuvable, 3.2 en nouvel onglet, bilan 2.4, 5.3, devis sans suivi, annuaire).
- **L-3 [MAJEUR · M] FAIT le 2026-10-07.** Renommer une organisation dans 1.3 détache ses commandes ; « Ajouter à l'annuaire » crée alors un doublon. *Fait :* lot 5 : domaine, liens et écrans faits et vérifiés en navigateur (défaut introuvable, 3.2 en nouvel onglet, bilan 2.4, 5.3, devis sans suivi, annuaire).
- **L-4 [MAJEUR · S] FAIT le 2026-10-07.** Enquête 2.3 « Livraison et réception » : client comparé en texte exact, et le PV cité comme fait peut être celui d'une autre commande. *Fait :* lot 5 : domaine, liens et écrans faits et vérifiés en navigateur (défaut introuvable, 3.2 en nouvel onglet, bilan 2.4, 5.3, devis sans suivi, annuaire).
- **L-10 [MINEUR · M] FAIT le 2026-10-07.** Liens 3.3 et 3.2 : la panne ne se lit pas dans la commande (promis au besoin §3), l'instrument n'est pas figé, les retraits ne sont pas dits. *Fait :* lot 5 : domaine, liens et écrans faits et vérifiés en navigateur (défaut introuvable, 3.2 en nouvel onglet, bilan 2.4, 5.3, devis sans suivi, annuaire).
- **L-11 [MINEUR · S] FAIT le 2026-10-07.** « Voir la fiche du poste » au plein écran jalon est un aller simple. *Fait :* lot 5 : domaine, liens et écrans faits et vérifiés en navigateur (défaut introuvable, 3.2 en nouvel onglet, bilan 2.4, 5.3, devis sans suivi, annuaire).
- **L-12 [MINEUR · S] FAIT le 2026-10-07.** Bilan 2.4 : date figée à la création, doublon possible, suppression de commande sans garde, un ordre au passage. *Fait :* lot 5 : domaine, liens et écrans faits et vérifiés en navigateur (défaut introuvable, 3.2 en nouvel onglet, bilan 2.4, 5.3, devis sans suivi, annuaire).
- **L-13 [MINEUR · S] FAIT le 2026-10-07.** Archiver une commande qui a une réserve ouverte arrête tout suivi, sans le dire. *Fait :* lot 0 : fait (déjà traité au lot 0).
- **L-14 [MINEUR · S] FAIT le 2026-10-07.** Contact ou organisation supprimé en 1.3 : au plein écran on ne peut plus changer le réceptionnaire. *Fait :* lot 5 : domaine, liens et écrans faits et vérifiés en navigateur (défaut introuvable, 3.2 en nouvel onglet, bilan 2.4, 5.3, devis sans suivi, annuaire).
- **L-15 [MINEUR · S] FAIT le 2026-10-07.** 5.3 / 5.4 : suggestions d'atelier bruyantes, bouton sans pré-remplissage, 5.4 absent. *Fait :* lot 5 : domaine, liens et écrans faits et vérifiés en navigateur (défaut introuvable, 3.2 en nouvel onglet, bilan 2.4, 5.3, devis sans suivi, annuaire).
- **L-16 [MINEUR · S] FAIT le 2026-10-07.** « Devis gagnés sans commande suivie » : tous les devis gagnés de tous les temps, sans date limite ni « ne pas suivre ». *Fait :* lot 5 : domaine, liens et écrans faits et vérifiés en navigateur (défaut introuvable, 3.2 en nouvel onglet, bilan 2.4, 5.3, devis sans suivi, annuaire).
- **L-17 [MINEUR · S] FAIT le 2026-10-07.** 2.3 : le nombre de livraisons du mois figé à vie dès la première frappe. *Fait :* lot 5 : domaine, liens et écrans faits et vérifiés en navigateur (défaut introuvable, 3.2 en nouvel onglet, bilan 2.4, 5.3, devis sans suivi, annuaire).
- **L-18 [MINEUR · S] FAIT le 2026-10-07.** Exemples : devis fantômes avec le seul exemple 3.4 ; chronologie impossible dans l'exemple complet. *Fait :* lot 5 : domaine, liens et écrans faits et vérifiés en navigateur (défaut introuvable, 3.2 en nouvel onglet, bilan 2.4, 5.3, devis sans suivi, annuaire).
- **L-20 [CONFORT · S] FAIT le 2026-10-07.** `OrderLink` (5.1) ne retrouve pas la réserve d'un lot clos. *Fait :* lot 5 : domaine, liens et écrans faits et vérifiés en navigateur (défaut introuvable, 3.2 en nouvel onglet, bilan 2.4, 5.3, devis sans suivi, annuaire).
- **L-21 [CONFORT · S] FAIT le 2026-10-07.** Le rapport mensuel n'a aucune ligne « Réceptions ». *Fait :* lot 5 : domaine, liens et écrans faits et vérifiés en navigateur (défaut introuvable, 3.2 en nouvel onglet, bilan 2.4, 5.3, devis sans suivi, annuaire).
- **L-22 [CONFORT · S] FAIT le 2026-10-07.** « Ajouter à l'annuaire » de l'onglet Suites crée aussi des cartes de personnes sans le dire. *Fait :* lot 5 : domaine, liens et écrans faits et vérifiés en navigateur (défaut introuvable, 3.2 en nouvel onglet, bilan 2.4, 5.3, devis sans suivi, annuaire).

### Lot 6. Exemples, migration, import

0 bloquant · 0 majeur · 13 mineur · 5 confort (18 points).

- **X-4 [MINEUR · S] FAIT le 2026-10-07.** « Retirer l'exemple » retire aussi les commandes et défauts d'exemple que l'entreprise a modifiés, sans le dire. *Fait :* lot 6 : exemple, migration, import.
- **X-5 [MINEUR · S] FAIT le 2026-10-07.** En vue équipe, « Retirer l'exemple » reste affiché alors que « Supprimer » est masqué. *Fait :* lot 5 écran : retrait de l'exemple masqué en vue équipe sans droit de suppression.
- **X-6 [MINEUR · M] FAIT le 2026-10-07.** Le renouvellement ne marche qu'une fois : un niveau 2 ne rafraîchirait aucune des 14 commandes. *Fait :* lot 6 : exemple, migration, import.
- **X-7 [MINEUR · M] FAIT le 2026-10-07.** Les dates relatives sont figées au jour de la mise à niveau, donc l'exemple enregistré vieillit et se désynchronise de 2.4/2.1. *Fait :* lot 6 : exemple, migration, import.
- **X-8 [MINEUR · S] FAIT le 2026-10-07.** Un jour sur 3 278, l'état « Réserves en retard » disparaît de l'exemple (2029-05-13), et 16 autres jours n'ont qu'un jour de marge. *Fait :* lot 6 : exemple, migration, import.
- **X-9 [MINEUR · S] FAIT le 2026-10-07.** 64 lignes de journal sur 178 tombent un samedi ou un dimanche, dont des réceptions et des signatures de PV. *Fait :* lot 6 : exemple, migration, import.
- **X-10 [MINEUR · S] FAIT le 2026-10-07.** Histoires incohérentes entre commande, devis et PV. *Fait :* lot 6 : exemple, migration, import.
- **X-11 [MINEUR · S] FAIT le 2026-10-07.** Deux photos contredisent le contrôle qu'elles prouvent. *Fait :* lot 6 : exemple, migration, import.
- **X-12 [MINEUR · S] FAIT le 2026-10-07.** Le bouton place des références vers d'autres outils vides. *Fait :* lot 6 : exemple, migration, import.
- **X-13 [MINEUR · S] FAIT le 2026-10-07.** L'exemple montre un fait qu'aucun écran ne permet de produire. *Fait :* lot 6 : exemple, migration, import.
- **X-14 [MINEUR · S] FAIT le 2026-10-07.** Un contact en double dans l'annuaire quand l'entreprise a déjà la personne. *Fait :* lot 6 : exemple, migration, import.
- **X-15 [MINEUR · S] FAIT le 2026-10-07.** Une seule commande abîmée (sans `milestones` ou `reception`) rend l'outil 3.4 inutilisable ; dans le HTML livré de 19:15, c'est toute l'entreprise. *Fait :* lot 6 : exemple, migration, import.
- **X-16 [MINEUR · S] FAIT le 2026-10-07.** Des faits inventés à l'import des anciens classeurs. *Fait :* lot 6 : exemple, migration, import.
- **X-17 [CONFORT · M] FAIT le 2026-10-07.** Les signatures et les photos se répètent. *Fait :* lot 6 : exemple, migration, import.
- **X-18 [CONFORT · S] FAIT le 2026-10-07.** Noms qui sont des fonctions. *Fait :* lot 6 : exemple, migration, import.
- **X-19 [CONFORT · S] FAIT le 2026-10-07.** Un exemple très métallurgique. *Fait :* lot 6 : en partie (un chantier non métallique ; pas de prestation de plus, libellés liés à 2.3/2.4).
- **X-20 [CONFORT · S] FAIT le 2026-10-07.** Quatre contrôles de départ à la même minute. *Fait :* lot 6 : exemple, migration, import.
- **X-21 [CONFORT · S] FAIT le 2026-10-07.** Note de test. *Fait :* lot 6 : exemple, migration, import.

### Lot 7. Hébergement en ligne et chantiers globaux (partagés avec 3.2 et 3.3)

1 bloquant · 11 majeur · 5 mineur · 1 confort (18 points).

- **G-3 [BLOQUANT · L] FAIT le 2026-10-07.** Un PV signé sur un appareil ne se rejoint pas avec la copie d'un autre : il est ignoré, écrasé ou perdu. *Fait :* lot 7 : fonction pure mergeDelivery (receptionsMerge.ts), branchée sur la fusion de fichier et le dossier partagé.
- **F-1 [MAJEUR · M] FAIT le 2026-10-07.** Chaque geste réécrit TOUT l'état, sur le fil principal : copie profonde + 2 aplatissements + comparaison JSON + `JSON.stringify` + `setItem`. *Fait :* lot 7 : hébergement et global.
- **F-6 [MAJEUR · M] FAIT le 2026-10-07.** Le plafond de 5 millions de caractères du navigateur est atteint à ≈ 90 commandes riches ou ≈ 400-460 commandes naturelles ; la signature fait la moitié d'une commande naturelle. *Fait :* lot 7 : hébergement et global.
- **F-8 [MAJEUR · S] FAIT le 2026-10-07.** Les photos sont réduites à l'affichage, pas à la prise, et sur le fil principal : première ouverture d'une commande à photos 0,4 à 2,1 s, PV 0,7 à 3,9 s, impression retardée de 0,85 à 3,85 s sans aucun signe à l'écran. *Fait :* lot 7 : hébergement et global.
- **G-13 [MAJEUR · M] FAIT le 2026-10-07.** Numérotation des PV : doublons entre appareils, trous, année prise sur l'horloge, aucune retrouvaille. *Fait :* lot 7 : hébergement et global.
- **G-16 [MAJEUR · L]** Données personnelles : rien n'existe (durée, effacement, anonymisation, information), et la preuve ne se laisse pas anonymiser telle quelle. *Correction :* voir le rapport M5-preuves.md
- **G-17 [MAJEUR · S] FAIT le 2026-10-07.** La preuve s'efface depuis d'autres écrans sans compter ce qui part. *Fait :* lot 7 : hébergement et global.
- **L-7 [MAJEUR · S] FAIT le 2026-10-07.** Une adresse `__proto__` ou `constructor` plante 6 outils reliés à 3.4. *Fait :* lot 7 : hébergement et global.
- **S-3 [MAJEUR · M] FAIT le 2026-10-07.** Dossier partagé : « Reconnecter le dossier » écrase le travail fait pendant que le navigateur redemandait l'accès. *Fait :* lot 7 : hébergement et global.
- **S-4 [MAJEUR · M] FAIT le 2026-10-07.** Dossier partagé : une commande est un seul enregistrement `delivery|<id>`, le plus récent gagne en entier ; une copie périmée efface le PV signé sur un autre poste. *Fait :* lot 7 : hébergement et global.
- **S-5 [MAJEUR · M] FAIT le 2026-10-07.** La fusion du fichier d'un téléphone ne reprend ni contrôles ni PV d'une commande déjà présente. *Fait :* lot 7 : hébergement et global.
- **S-6 [MAJEUR · S] FAIT le 2026-10-07.** Le numéro de PV est calculé sur l'état local : deux appareils donnent le même numéro à deux commandes. *Fait :* lot 7 : hébergement et global.
- **P-14 [MINEUR · S] FAIT le 2026-10-07.** L'adresse imprimée dans les QR reprend tout `window.location.href` avant le `#`. *Fait :* lot 7 : hébergement et global.
- **S-13 [MINEUR · S] FAIT le 2026-10-07.** Le QR imprimé recopie la chaîne de requête de l'adresse de la page. *Fait :* lot 7 : hébergement et global.
- **S-18 [MINEUR · S] FAIT le 2026-10-07.** « Restaurer une sauvegarde » remplace tout sans garder l'état courant ; l'accueil vide n'offre pas de bouton Restaurer. *Fait :* lot 7 : hébergement et global.
- **S-19 [MINEUR · S] FAIT le 2026-10-07.** La clé `photo|<hash>` des images en ligne (anciennes données, exemples) vient d'un hachage qui lit un caractère sur sept : deux images différentes de même longueur et même 1 caractère sur 7 se confondent. *Fait :* lot 7 : hébergement et global.
- **S-20 [MINEUR · déploiement] FAIT le 2026-10-07.** En `file://`, tous les fichiers HTML locaux partagent la même origine : leurs données et leurs 5 Mo. *Fait :* lot 7 : hébergement et global.
- **S-21 [CONFORT · M] FAIT le 2026-10-07.** `update()` coûte autant que la taille de tout l'état, et les photos retirées restent dans le magasin. *Fait :* lot 7 : écriture par partage structurel ; les originaux de photos retirées ne sont toujours pas purgés.

### Lot 8. Accessibilité et textes

0 bloquant · 3 majeur · 10 mineur · 4 confort (17 points).

- **A-4 [MAJEUR · S] FAIT le 2026-10-07.** Pluriels, accords et ponctuation faux à l'écran : 13 cas prouvés. *Fait :* lot 8 : textes, accords, noms accessibles, structure (voir le compte rendu L8).
- **A-5 [MAJEUR · S] FAIT le 2026-10-07.** « (s) » dans 5 libellés visibles et dans le journal (règle du propriétaire). *Fait :* lot 8 : textes, accords, noms accessibles, structure (voir le compte rendu L8).
- **A-6 [MAJEUR · S] FAIT le 2026-10-07.** Six consignes ou conseils déguisés alors que la règle est « des faits, jamais d'ordres ni de conseils ». *Fait :* lot 8 : textes, accords, noms accessibles, structure (voir le compte rendu L8).
- **A-7 [MINEUR · S] FAIT le 2026-10-07.** Le nom accessible d'une carte dit un autre état que l'étiquette visible dans 3 cartes sur 14, et il masque la tâche. *Fait :* lot 8 : textes, accords, noms accessibles, structure (voir le compte rendu L8).
- **A-8 [MINEUR · S] FAIT le 2026-10-07.** Boutons identiques sans le jalon ni la réserve dans leur nom. *Fait :* lot 8 : textes, accords, noms accessibles, structure (voir le compte rendu L8).
- **A-10 [MINEUR · S] FAIT le 2026-10-07.** Contrastes sous 4,5:1 (hors global) : cartes archivées, états verrouillés, « absent ce jour », pad grisé. *Fait :* revue de design : états verrouillés en pastille lisible, boutons désactivés à 6:1.
- **A-11 [MINEUR · M] FAIT le 2026-10-07.** Aucune espace insécable devant « % », « : », « » » ni dans « 14 h 05 » hors PV/PDF : des coupures mesurées. *Fait :* lot 8 : textes, accords, noms accessibles, structure (voir le compte rendu L8).
- **A-12 [MINEUR · S] FAIT le 2026-10-07.** Trois formats de date et deux formats d'heure sur le même écran. *Fait :* lot 8 : textes, accords, noms accessibles, structure (voir le compte rendu L8).
- **A-13 [MINEUR · S] FAIT le 2026-10-07.** Un mot par notion : onze doublets relevés. *Fait :* lot 8 : textes, accords, noms accessibles, structure (voir le compte rendu L8).
- **A-14 [MINEUR · S] FAIT le 2026-10-07.** Vocabulaire non neutre ou liste fermée sans « Autre, précisez » : cinq endroits. *Fait :* lot 8 : textes, accords, noms accessibles, structure (voir le compte rendu L8).
- **A-15 [MINEUR · S] FAIT le 2026-10-07.** Écran, impression et PDF du PV ne disent pas la même chose, et deux formules affirment une qualité que l'outil ne vérifie pas. *Fait :* lot 8 : textes, accords, noms accessibles, structure (voir le compte rendu L8).
- **A-16 [MINEUR · S] FAIT le 2026-10-07.** Structure : deux `h1` à l'écran 6, un `h1` sous un `h2`, deux `main` et `banner` dans le plein écran, `aria-modal` sans `inert`. *Fait :* lot 8 : textes, accords, noms accessibles, structure (voir le compte rendu L8).
- **A-17 [MINEUR · S] FAIT le 2026-10-07.** 84 % du texte de l'écran principal est en pixels fixes : il ne suit pas la taille de police du navigateur. *Fait :* lot 8 : textes, accords, noms accessibles, structure (voir le compte rendu L8).
- **A-18 [CONFORT · S] FAIT le 2026-10-07.** Aucun `@media (prefers-reduced-motion)` dans le CSS construit (0 occurrence). *Fait :* lot 8 : textes, accords, noms accessibles, structure (voir le compte rendu L8).
- **A-19 [CONFORT · S] FAIT le 2026-10-07.** Trois annonces et deux fois « Qui contrôle ? » à chaque écran du plein écran. *Fait :* lot 8 : textes, accords, noms accessibles, structure (voir le compte rendu L8).
- **A-20 [CONFORT · S]** « Annuler » dure 8 s sans pouvoir être prolongé. *Correction :* voir le rapport M8-textes.md
- **A-21 [CONFORT · S] FAIT le 2026-10-07.** Segments de la carte : « conforme après reprise » a le même vert que « conforme ». *Fait :* lot 8 : textes, accords, noms accessibles, structure (voir le compte rendu L8).

### Lot 9. Tests, performance, qualité du code

0 bloquant · 9 majeur · 19 mineur · 2 confort (30 points).

- **F-2 [MAJEUR · S] FAIT le 2026-10-07.** Plusieurs écritures complètes pour un seul geste. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **F-3 [MAJEUR · S] FAIT le 2026-10-07.** Les réglages de l'outil écrivent à CHAQUE touche : une écriture complète par lettre ou chiffre. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **F-4 [MAJEUR · M] FAIT le 2026-10-07.** L'écran principal recalcule tout à chaque rendu : à chaque frappe de la recherche, chaque puce, chaque bascule Cartes/Liste, chaque « Afficher 24 de plus », chaque ouverture de fiche ou de plein écran, et à chaque écriture même…. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **F-5 [MAJEUR · S] FAIT le 2026-10-07.** `reserveLateDays` et `shiftDays` comptent les jours un par un (`addDays` + `parseDate` à chaque jour) : une réserve oubliée coûte d'autant plus cher qu'elle est vieille, et 4 réserves de 500 jours font 56 % du rendu de l'écran. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **T-1 [MAJEUR · M] FAIT le 2026-10-07.** Les écrans qui écrivent la preuve (jalon plein écran, réception en 6 pas) et la fiche (autosave, verrou) n'ont aucun test, et `renderToStaticMarkup` ne peut pas les rendre. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **T-2 [MAJEUR · S] FAIT le 2026-10-07.** 28 règles de 3.4 ne sont épinglées par aucun test (57 % de mutants tués). *Fait :* lot 9 : vitesse, tests, qualité du code.
- **T-3 [MAJEUR · S] FAIT le 2026-10-07.** Bombe à retardement : la suite devient rouge le 1er janvier 2027. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **T-4 [MAJEUR · S] FAIT le 2026-10-07.** Cinq tests verts protègent un défaut déjà signalé : corriger le défaut les casse, et ils trompent un lecteur. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **T-6 [MAJEUR · M] FAIT le 2026-10-07.** 3.4 est collé à 3.3 et à 3.2 par des imports et par 7 copies ; l'autre session réécrit justement 3.3. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **D-18 [MINEUR · S] FAIT le 2026-10-07.** Coût proportionnel au retard dans `reserveLateDays`, rappelé ~8 fois par réserve. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **F-7 [MINEUR · S] FAIT le 2026-10-07.** Le seul vrai calcul quadratique : `orgOf` appelé pour chaque client à chaque rendu, même en vue Cartes. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **F-9 [MINEUR · S] FAIT le 2026-10-07.** Les cinq onglets de la fiche sont montés en permanence : 88 % de ses nœuds sont cachés, les photos des onglets cachés sont décodées à l'ouverture, `comebacks` est recalculé à chaque rendu. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **F-10 [MINEUR · S] FAIT le 2026-10-07.** Chaque changement d'état refait trois fois `receptionTodos` et une fois `allTasks` (tous les outils) dans `App`, et ce sans lien avec l'écran affiché. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **F-11 [MINEUR · S] FAIT le 2026-10-07.** `FeedBox` calcule les indicateurs de TOUS les outils pour n'en afficher que 5, et `receptionFeeds` reconstruit toutes les présentations 5 fois. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **F-12 [MINEUR · S] FAIT le 2026-10-07.** Tri par urgence en O(N log N × tâches). *Fait :* lot 9 : vitesse, tests, qualité du code.
- **F-13 [MINEUR · M]** Démarrage : l'écran 3.4 est prêt à 0,15 s (5 commandes) puis 0,43 s (1 000) sur portable, 1,1 s puis 3,1 s sur tablette ×6 ; fichier unique de 1,98 Mo. *Correction :* faire le parcours `inlineMap` seulement si un drapeau de version de l'état dit qu'il reste des photos en ligne ; sinon rien d'urgent.
- **F-14 [MINEUR · M]** HYPOTHÈSE (lu, non mesuré : le dossier partagé et les onglets multiples ne tournent pas sans interface) : mode dossier partagé et plusieurs onglets. *Correction :* à mesurer avec un vrai dossier ; ne relire que les fichiers dont la date change ; comparer par identité.
- **L-19 [MINEUR · M] FAIT le 2026-10-07.** Aucun test d'intégrité inter-outils pour les cas qui cassent. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **T-7 [MINEUR · S] FAIT le 2026-10-07.** Cycle d'imports `commercial` → `receptions` → `quality` → `commercial`. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **T-8 [MINEUR · S] FAIT le 2026-10-07.** Le délai de 5 s ne tient pas sous charge et deux tests ne passent que grâce à un 30 000 ms. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **T-9 [MINEUR · S] FAIT le 2026-10-07.** Assertions faibles, tests qui recopient le code, tests trop gros. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **T-10 [MINEUR · S] FAIT le 2026-10-07.** Le PDF du PV est testé par le texte de 14 exemples tous en Latin-1 : P-2 passe inaperçu, 18 helpers n'ont aucun test direct. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **T-11 [MINEUR · S] FAIT le 2026-10-07.** Code mort et exports inutiles. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **T-12 [MINEUR · S]** Pas de linter : 5 commentaires `eslint-disable` pour un outil qui n'est pas installé. *Correction :* soit retirer les 5 commentaires, soit ajouter ESLint avec seulement `rules-of-hooks` et `exhaustive-deps` (coût : 77 Mo de `node_modules`).
- **T-13 [MINEUR · M]** `noUncheckedIndexedAccess` absent : 120 erreurs sur 73 lignes de code de production 3.4. *Correction :* l'activer d'abord sur `receptions*.ts` (26 erreurs) ; ne pas l'activer partout d'un coup.
- **T-14 [MINEUR · S]** Les tests ne sont une barrière nulle part, et tout 3.4 est hors de l'historique git. *Correction :* `"build": "tsc --noEmit && vitest run && vite build"` dans le script de construction (4,2 s au repos), puis un premier commit.
- **T-15 [MINEUR · M]** Fichiers et lignes trop longs. *Correction :* sortir `Frame`, `Ask`, `NameChips`, `Box`, `BIG`, `FIELD`, `useKeys`, `useAwake` dans `FullScreen.tsx` (T-6).
- **T-16 [MINEUR · S] FAIT le 2026-10-07.** Noms et commentaires trompeurs. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **F-15 [CONFORT] FAIT le 2026-10-07.** La pagination du registre borne bien le DOM, mais la file « À faire » n'a aucune borne, et chaque page re-rend toutes les cartes déjà affichées. *Fait :* lot 9 : vitesse, tests, qualité du code.
- **T-17 [CONFORT · S] FAIT le 2026-10-07.** De la logique pure est enfermée dans des fichiers d'écran, donc sans test. *Fait :* lot 9 : vitesse, tests, qualité du code.

---

## 5. Ce qui est déjà bon et qu'il ne faut pas casser

- **Domaine** : fonctions pures (testées sur objets gelés), dates sûres (4 360 cas × 10 fuseaux sans écart avec un oracle UTC), machine à états cohérente, 14 anciennes formes de commande lues de façon idempotente, aucune collision de numéro de PV sur un seul appareil, journal alimenté par chaque geste de vie.
- **Argent et textes** : aucun montant ni mot de facturation dans 3.4 ni dans le PDF ; aucun tutoiement ni « il faut » ; la clause de retenue n'est qu'une mention ; aucun statut porté par la couleur seule ; icônes toutes masquées aux lecteurs d'écran ; 51 éléments interactifs de l'écran principal tous nommés, sans doublon.
- **Écrans** : aucun débordement horizontal à 320 et 375 px ; aucun champ sous 16 px ni cible sous 44 px dans les plein-écran ; une adresse `#3.4~…` piégée n'en plante aucun autre chemin de 3.4 ; la signature, la libération et les levées s'écrivent à chaque geste.
- **Impression** : `PvView` et `PvPrint` sont le même composant ; toutes les photos sont présentes au moment de `print()` même à CPU ralenti ×20 ; lisible en noir et blanc ; PDF 1.4 valide en ASCII pur ; QR décodés.
- **Exemple** : 14 commandes qui montrent les 12 états, marqueur propre `receptionExampleLevel`, jamais appliqué à une entreprise réelle, aucune alerte parasite sur 1.1, 2.3, 2.4, 5.x pendant 3 278 jours ; 6 des 8 liens inter-outils sont branchés avec le bon appel, aucun montant ne les traverse, aucun indicateur n'est écrit en silence dans 1.1.
- **Sécurité** : aucune XSS, PDF valide avec du texte hostile, CSP de production tenue.

---

## 6. Où sont les preuves

Rapports condensés des 10 modules : dossier temporaire de la session, `scratchpad/audit/` (`M1-domaine.md` à `M10-tests.md`), avec leurs scripts, sorties et captures (`m1/` à `m10/`, `shots/`). Les 55 tests écrits par l'auditeur M10 (30 rouges qui prouvent les bugs des rapports M1, M4, M5 et la quantité, 25 verts qui tuent 23 mutants) sont dans `scratchpad/audit/m10/new-tests/`. Ce dossier est temporaire : recopier ce qui doit durer avant de le perdre.
