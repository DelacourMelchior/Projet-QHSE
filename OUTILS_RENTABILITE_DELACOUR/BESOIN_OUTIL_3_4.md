# Outil 3.4 « Réceptions » : ce dont une PME a besoin (phase 1)

Établi le 2026-10-06 après lecture de tout le code de 3.4 et de ses liens (2.1, 2.3, 2.4, 3.3, 5.1, 1.3), et du modèle 3.2 (`AMELIORATIONS_OUTIL_3_2.md`). **Rien n'est codé.** Ce document attend le feu vert avant la phase 2.

Niveaux : **E** essentiel (sans lui l'outil ne tient pas sur le terrain), **U** utile, **O** option (à retirer sans regret si le périmètre est trop gros).

Règles du propriétaire appliquées partout : aucun chiffrage, prix, marge ni facturation ; remplir une fois et garder vivant d'un tap ; vocabulaire neutre (nommer l'action, pas le moyen), listes terminées par « Autre, précisez » ; messages d'alerte = des faits, jamais des ordres au client ; aucun export PDF ou CSV nouveau (le PV existant reste) ; une seule langue ; exemples fictifs complets avec marqueur propre à 3.4 ; `DESIGN_OUTILS.md` (11 px minimum, pas d'emoji, statut = couleur + libellé, cibles de 44 px) ; code le plus court qui marche.

Ancrage ISO 9001:2015 (de mémoire, la norme n'a pas été relue) : 8.5.1 maîtrise de la réalisation, surveillance et mesure aux étapes prévues ; 8.6 libération (preuve de conformité, trace de la personne qui autorise, pas de libération avant achèvement sauf dérogation approuvée) ; 8.7 sorties non conformes ; 8.5.2 identification et traçabilité ; 8.5.4 préservation (emballage) ; 7.1.5 instruments de mesure ; 7.5 informations documentées maîtrisées (une modification se trace) ; 9.1.2 satisfaction du client (lien 2.4).

---

## 0. Ce que fait l'outil aujourd'hui (constats dans le code)

- Un écran de 223 lignes et **une seule fenêtre « commande »** (`Receptions.tsx`) qui mêle commande, jalons, libération, PV et bilan 2.4. La logique de 3.4 tient en 84 lignes dans `operations.ts` (3.3 en est déjà sortie). **4 tests** de logique, 1 de PDF, 1 d'exemple.
- **Jalons : exactement 4**, sans ajout ni retrait. `Params.milestoneTemplates` est lu (`templatesOf`) mais **aucun écran ne l'écrit** : l'entreprise ne peut pas faire ses modèles. Le modèle par défaut est de la métallerie (« Débit matière », « Assemblage », « Finition : 80 microns »).
- **Aucune photo par jalon.** Seuls `pvPhoto` et `liftPhoto` existent.
- **Contrôle d'un jalon** : deux boutons ✓ ✗ de 22 px (`p-1` + icône 14 px), le nom vient de `author` (nom libre de l'appareil, « anonyme » par défaut). **Non conforme** propose « Déclarer au bac rouge » : **chaque clic crée un nouveau défaut 5.1**, le jalon ne retient pas son défaut, et recocher ✓ efface l'échec sans trace.
- **Libération** : le bouton est inactif tant que les jalons ne sont pas tous conformes, mais la date de libération reste modifiable à la main ; aucune signature de libération (la signature « entreprise » du PV sert à tout).
- **Réception** : une seule réception par commande (**pas de livraison partielle**), une seule réserve en texte libre (**sans photo**, sans levée par réserve), un **refus sans motif** (le PV imprime des pointillés) et **sans suite** (état terminal) ; aucune date de livraison prévue, donc aucun retard de livraison possible ; `reception.date` sert à la fois de jour de livraison et de jour du PV.
- **Preuve** : deux signatures dessinées, **sans date ni heure**, et **rien n'est verrouillé** : un PV signé reste modifiable (résultat, réserve, montant, date) sans journal. La levée de réserve peut précéder la réception.
- **Enregistrement** : copie locale + Enregistrer / Annuler ; rien n'est écrit à la fermeture ; la fenêtre réécrit la commande entière (`x.deliveries[d.id] = d`), donc un écran périmé écrase un jalon ou une signature faits entre-temps (pas de `takeLife`). « Supprimer » efface une commande signée sur un `window.confirm`, sans annulation.
- **Règles** : levée sous 7 jours **calendaires** (3.1, 2.3 et 5.1 comptent en jours ouvrés), `LIFT_DAYS` et `MAX_RETENTION` en dur, aucun réglage.
- **Messages en ordres** : « ne pas passer au jalon suivant avant correction », « le client garde la retenue tant que… », « la facture de solde attend », « faire signer ».
- **Terrain** : fenêtre de bureau à six colonnes, repliée en une colonne sur téléphone ; pas d'écran « sur place chez le client », pas de QR code sur la commande ; « Imprimer » imprime la page entière de l'écran (`window.print`, pas `usePrintOne`).
- **Liens** : 2.4 (bilan créé depuis une réception, liste des réceptions sans bilan, délai promis du devis contre délai réel), 2.1 (`quoteId` : client et objet repris, montant repris), 5.1 (à sens unique, depuis un jalon, par texte), 3.3 (une panne sait quelles commandes elle a touchées, 3.4 ne le dit pas), 1.1 (`deliveriesOf` : base du taux de réclamation), 2.3 (point d'enquête « Livraison et réception » ouvre 3.4 à la racine), `clients.ts` (réceptions d'un client). **Non reliés** : annuaire 1.3 (client et réceptionnaire en texte libre), 3.2, 3.3 (instruments), 4.2 (qui peut libérer), 5.3, 5.4.
- **Exemples** : 8 commandes fictives dans `operationsExamples.ts`, partagées avec 3.1 à 3.3 par un seul bouton ; **`completeCommercialExamples` (marqueur `exampleLevel` 11, celui de 2.4) rajoute deux commandes** (`dl_demo_7`, `dl_demo_8`) : 3.4 n'a pas de marqueur propre.
- **Tâches** : 3 seulement (faire signer, lever la réserve, libérer) ; rien pour « jalon à contrôler », « livraison prévue », « bilan à poser » côté 3.4.

---

## 1. Argent, retenue et règle 95/5, au regard de « pas de chiffrage ni de facturation »

**Constat.** Dans 3.4, l'argent est partout : `reception.amount` (montant de la facture), `amountFromQuote` (bouton « Reprendre » le montant du devis), `retentionPct`, `split()` (« payable tout de suite » et « retenu »), la tuile « Montant retenu », le message « X € retenus par les clients », « la facture de solde attend », le PV qui imprime « bon pour facturation du solde à 100 % ». C'est de la **facturation**. Le 2026-10-02 vous avez retiré la facture de 2.4 (« on cherche simplement à mesurer la satisfaction client ») ; 3.4 contient la même chose.

**Ce que je propose.**

| Élément | Décision | Pourquoi |
|---|---|---|
| La règle « une réserve mineure ne bloque pas la réception, elle se lève sous N jours » | **GARDER** | C'est une règle de réception, pas de comptabilité. |
| Le délai de levée (7 jours) | **GARDER, en réglage de l'outil** (jours ouvrés ou calendaires au choix, comme 3.1) | Aujourd'hui en dur, calendaire. |
| Le pourcentage de retenue (5 % au plus) | **TRANSFORMER en mention** : clause « retenue prévue au contrat : oui / non, % maximum » dans le réglage, recopiée sur le PV si elle est cochée | Le % est une clause du contrat, pas un calcul : la mention reste, l'euro disparaît. |
| Les dates (réception, levée, retard de levée) | **GARDER** | Ce sont des faits. |
| `amount`, `amountFromQuote` et le bouton « Reprendre » | **RETIRER** | Facturation. Les anciennes valeurs restent dans les données, invisibles (comme les champs supprimés le 2026-10-01). |
| `split()`, « Payable tout de suite », tuile « Montant retenu », message « € retenus » | **RETIRER** | Calcul de facturation. |
| « Bon pour facturation du solde à 100 % » sur le PV | **REMPLACER** par « Réception prononcée sans réserve » | Le PV atteste la réception, pas un droit à facturer. |
| « La facture de solde attend » | **RETIRER** | Ordre et facturation. |
| `quoteId` (devis d'origine) | **GARDER**, sans le montant : client, objet et **date promise** (date de décision + semaines) | Alimente le « délai promis contre délai réel » de 2.4. |

Le message « retenue annoncée supérieure au maximum du contrat » reste, en fait (« retenue de 10 % saisie, 5 % au maximum prévu »).
Variante si vous voulez garder les montants comme pour les coûts de pannes de 3.3 : à me dire, je ne retire alors que `split` et les messages de facturation.

---

## 2. La liste du besoin

### A. Contrôle à chaque jalon (en atelier, avant expédition)

- **A1 E** Écran « Jalon » plein écran sur téléphone ou tablette : un jalon à la fois, gros boutons de 64 px **Conforme / Non conforme**, sans clavier, utilisable avec des gants. Ouvert par le QR de la commande (`#3.4~jalon:<id>`) ou depuis la file « À faire ».
- **A2 E** Trois états par jalon : à contrôler, conforme, non conforme ; plus **« conforme après reprise »** : l'échec reste dans l'historique du jalon (contrôlé non conforme le…, repris par…, recontrôlé conforme le…). Plus rien ne s'efface en recochant.
- **A3 E** Qui contrôle : **gros boutons parmi les personnes** (4.2 : personnes actives, hors absents du jour), jamais de saisie libre, jamais préremplie sur un poste partagé ; date **et heure**.
- **A4 E** Photos par jalon : la preuve (la pièce, la cote lue) et l'écart, en un tap (`PhotoBox`, `Pic`, `PhotoEditor`) ; une **photo de référence** facultative dans le modèle (« un bon jalon ressemble à ça »).
- **A5 E** Valeur mesurée avec son exigence ; **unité** ; pour un jalon mesurable, bornes mini / maxi fixées une fois dans le modèle : hors bornes = non conforme d'office (fait affiché). Texte libre pour les jalons qualitatifs.
- **A6 E** Jalons modifiables sur la commande : ajouter, retirer, réordonner, **« sans objet » avec motif** (un jalon qui ne s'applique pas ne bloque pas la libération).
- **A7 E** **Modèles de jalons éditables par l'entreprise** (réglages de l'outil) : renommer, ajouter, retirer, par type d'affaire ; **modèles par défaut neutres** pour tout métier (plus de « 80 microns ») : Fabrication, Chantier ou pose, Prestation ou service, Revente ou négoce (conformité à la commande, quantité, conditionnement), Intervention, Autre. Choix du modèle à la création en un tap. Reprise de `milestoneTemplates` existant.
- **A8 E** Jalon non conforme → défaut 5.1 en un tap, **un seul défaut par jalon** (le lien est mémorisé : `ncId`), son statut visible dans le jalon ; la commande n'est libérable que si le défaut a une décision. Fini les doublons.
- **A9 U** Un jalon non conforme **bloque le suivant en fait** (pas en verrou dur) ; passer outre = dérogation : qui, pourquoi, tracée.
- **A10 U** Jalon critique : « contrôlé par un second » (deuxième nom, un tap).
- **A11 U** Le point à contrôler renvoie à l'instruction de poste 3.2 (ouverture plein écran).
- **A12 U** Instrument de mesure utilisé, choisi parmi ceux de 3.3 ; « étalonnage échu » dit en fait.
- **A13 U** Traçabilité : n° de lot, n° de série, matière ou version (8.5.2), saisie libre ou liste + « Autre, précisez ».
- **A14 O** Contrôle par échantillon : n pièces contrôlées sur N, n non conformes.

### B. Libération avant expédition

- **B1 E** Libération = **acte nommé** : une personne (gros boutons), date et heure automatiques, **signature au doigt facultative** ; la date n'est plus modifiable à la main.
- **B2 E** Conditions dites en faits : jalons applicables conformes, défauts liés avec décision. Sinon libération impossible, sauf **dérogation** motivée (qui, pourquoi ; 8.6).
- **B3 E** Rouvrir un jalon après libération **défait la libération** (retour à « à libérer »), avec trace ; « Annuler la libération » avec motif.
- **B4 U** **Contrôle de départ** (emballage, accessoires, notice, documents, quantité) : liste modifiable dans le modèle, séparée des jalons de fabrication.
- **B5 U** **Date de livraison prévue** (reprise du devis 2.1 : décision + semaines, ou saisie) : « à libérer avant le… », « livraison prévue demain, jalon 3 non fait » dit en fait ; **livraison en retard** possible.
- **B6 U** Numéro de bon de livraison (référence, pas d'export).
- **B7 O** Photo du chargement ou de l'emballage avant départ.

### C. Livraison et réception chez le client

- **C1 E** Écran « Réception » plein écran, **guidé, chez le client** : 1. rappel de la commande, 2. jalons contrôlés avec leurs photos, 3. constats et réserves, 4. résultat, 5. signature du client, 6. PV terminé à l'écran. Ouvert par le QR de la commande ou la file.
- **C2 E** Résultat en 3 gros boutons : **Sans réserve · Avec réserve(s) · Refusée**.
- **C3 E** **Réserves multiples** : chacune avec description, photo, étape ou zone concernée, **gravité** (mineure, bloquante) ; chacune se lève séparément.
- **C4 E** **Refus** : motif obligatoire (liste modifiable + « Autre, précisez ») et photo ; suite choisie (à reprendre et représenter, à remplacer, Autre précisez). **Un refus n'est plus terminal** : une nouvelle présentation a son propre PV.
- **C5 E** **Client et réceptionnaire depuis l'annuaire 1.3** (organisation, personne, fonction, e-mail) ou saisis, et « Ajouter à l'annuaire » en un tap (comme 2.4) ; réceptionnaire habilité (maître d'ouvrage, entreprise générale) : qualité notée.
- **C6 E** **Signature du client au doigt avec son nom**, signature de l'entreprise (qui remet), **date et heure sur chacune** ; à la signature, le PV est **verrouillé**.
- **C7 E** Preuves de repli : photo du PV papier signé (existe), ou mention « client absent » / « signature refusée » avec témoin (nom) et date. L'outil n'affirme aucun effet juridique.
- **C8 U** Constat contradictoire : photos de l'état à la livraison, **quantité comptée** contre quantité attendue.
- **C9 U** Lieu de la réception (site, chantier, adresse).
- **C10 U** **PV lisible sur téléphone** et remis en main propre : le PV complet s'affiche à l'écran (jalons, photos, réserves, signatures, date et heure).
- **C11 U** Réception par lots ou zones (étages, bâtiments) : chaque zone reçue séparément (voir D).
- **C12 O** PV envoyé au client (e-mail préparé) : à ne faire qu'à votre demande, c'est un envoi, pas un export.
- **C13 O** Mode hors ligne chez le client (après l'hébergement en ligne).

### D. Livraisons partielles et lots

- **D1 E** Une commande peut être **livrée en plusieurs fois** (quantités, lots, zones) : chaque livraison a sa date, sa quantité, sa libération, son PV, ses réserves. La commande est **soldée** quand la quantité est reçue.
- **D2 E** **Reste à livrer** (commandée − reçue) dit en fait ; état « livrée en partie ».
- **D3 U** Accord du client pour livrer en plusieurs fois, noté (qui, quand).

### E. Réserves et levée

- **E1 E** **Cycle d'une réserve** : émise au PV, prise en charge (qui, pour quand), reprise faite (photo), levée constatée (par qui côté client, quand, signature au doigt ou photo).
- **E2 E** **Délai de levée en réglage de l'outil** (7 jours par défaut ; jours ouvrés ou calendaires au choix) ; **échéance par réserve** ; le retard est un fait (« 3 jours de retard »).
- **E3 E** Levée **sans le client sur place** : photo + « constaté par » + date ; client injoignable = fait affiché. La levée ne peut pas précéder la réception.
- **E4 U** Une réserve ouvre un défaut 5.1 en un tap (un seul lien mémorisé) ; son état se lit dans la réserve.
- **E5 U** Même réserve revenue sur 2 commandes en 12 mois : fait « revenue 2 fois » et bouton vers un atelier 5 Pourquoi (5.3).
- **E6 U** Réserve bloquante (réception reportée) distinguée de la réserve mineure (réception prononcée) : le PV ne dit pas la même chose.

### F. La règle 95/5 sans argent (voir §1)

- **F1 E** **Clause de retenue en réglage de l'outil** : prévue au contrat oui / non, % maximum, délai de levée. Le PV la recopie si elle est cochée. Aucun euro.
- **F2 E** Retirer `amount`, « Reprendre », `split`, la tuile « Montant retenu », le message « € retenus », « Payable tout de suite », « bon pour facturation » ; remplacer par des faits (voir §1).
- **F3 E** Le plafond de retenue reste un contrôle en fait : « retenue de 10 % saisie, 5 % au maximum prévu ».

### G. La liste, la file, la création

- **G1 E** **File « À faire »** (modèle `SopQueue`, `EqQueue`) : jalon à contrôler aujourd'hui, à libérer, livraison prévue, livrée à faire signer, réserve à lever (échéance), refusée à représenter, bilan 2.4 à poser ; triée par ton puis échéance ; en faits.
- **G2 E** Liste : filtres (En cours · À livrer · Réserves · Réceptionnées · Archivées) avec compteurs, **recherche** (n° de commande, client, livrable), tri par échéance ; cartes lisibles à 375 px (jalons en segments **et** en mots : « 2 jalons sur 4 »), statut = couleur + libellé.
- **G3 E** États plus justes : en cours · jalon non conforme · à libérer · libérée · livrée, PV à signer · reçue sans réserve · livrée en partie · réserves à lever · réserves en retard · réserves levées · refusée · archivée.
- **G4 E** **Création en 3 gestes** : modèle de jalons, client (annuaire), livrable ; le reste plus tard. Depuis un devis gagné de 2.1 en un tap (client, objet, date promise repris) ; liste « devis gagnés sans commande suivie ».
- **G5 U** Vue par client (modèle de 2.4) : réceptions d'un client, part sans réserve, délais, lien annuaire.
- **G6 U** **Archiver** (une réception signée ne se supprime pas) ; « Supprimer » seulement sans contrôle ni signature ; bandeau « Retiré · Annuler » de 8 s.
- **G7 U** Dupliquer une commande (série répétée) : modèle et client repris, aucun résultat.

### H. Preuves, journal, impression

- **H1 E** **Journal de la commande** (créée, jalon contrôlé, libérée, livrée, signée, réserve levée, corrigée) : qui, quand, quoi. Journal global comme les autres outils.
- **H2 E** Un PV signé n'est plus modifiable ; une correction passe par une ligne journalisée (qui, quand, pourquoi).
- **H3 E** **Fiche suiveuse imprimée** (jalons à cocher) avec le **QR de la commande**, par l'impression du navigateur (`usePrintOne`, A4, attend les photos). Remplace « imprimez le PV avant de commencer ».
- **H4 E** **PV imprimé** par le navigateur, lisible : photos des réserves et des jalons clés, signatures dessinées, date et heure, lieu, clause de retenue (F1), **sans montant**. Le PDF `pvPdf` existant reste, mis à jour (plusieurs réserves, motif de refus, lots, plus de montant, numéro de page). Aucun nouvel export.
- **H5 U** Numéro de PV automatique (`PV-2026-014`, comme les défauts `NC-2026-014`).
- **H6 U** Dossier de preuve d'une commande en une page, par l'impression du navigateur (même question que 3.2, §16 point 3).

### I. Enregistrement et pertes de données (reprise du lot 0 de 3.2)

- **I1 E** **Fiche vivante** : séparer le contenu (ce que la personne tape) de la vie (jalons contrôlés, libération, réserves, signatures, journal, état), comme `takeLife` en 3.2 et 3.3 ; un écran périmé n'écrase plus rien.
- **I2 E** Brouillon écrit au fil de la frappe, à la fermeture, au changement d'outil, quand l'onglet passe en arrière-plan.
- **I3 E** « Retiré · Annuler » de 8 s pour tout retrait (jalon, réserve, photo) ; confirmation avant de perdre ; fin du `window.confirm` natif.
- **I4 E** Supprimer seulement si rien n'est perdu, sinon Archiver.
- **I5 E** Photos en références `photo:…`, jamais en base 64 ; sauvegardes .json avec les photos.
- **I6 E** Cibles de 44 px partout, police de 16 px sur tactile, aucun débordement à 320 et 375 px.
- **I7 U** Fiche en **onglets** sur mobile (Commande · Jalons · Libération · Réception · Suites), pastilles « ce qui manque » en faits.
- **I8 U** Lecture tolérante des anciennes données : l'unique `reception` d'avant devient la livraison 1, les champs absents prennent leur défaut.

### J. Exemples fictifs et migration

- **J1 E** **Marqueur propre** `Params.receptionExampleLevel` et mise à niveau sans écraser (`completeReceptionExamples`) ; sort la dépendance de `completeCommercialExamples` (`dl_demo_7` et `dl_demo_8` sous `exampleLevel` 11).
- **J2 E** **Exemple qui montre tous les états** : en cours, jalon non conforme avec son défaut puis la reprise, à libérer, libérée, livrée à faire signer, sans réserve, deux réserves dont une levée avec photo, réserve en retard, refusée puis représentée, livrée en partie, une commande de chantier, une prestation ; avec photos (dessins), signatures dessinées, clients de l'annuaire, bilans 2.4 posés et à poser.
- **J3 E** « Voir un exemple traité » propre à 3.4 (`applyReceptionExample`), qui remplit les collections vides seulement.
- **J4 U** « Retirer l'exemple » sans toucher aux commandes de l'entreprise.

### K. Chiffres proposés au tableau de pilotage 1.1

- **K1 U** **Proposés, jamais écrits en silence** (FeedBox, rôles `KpiRole`, `addReceptionKpis`) : réceptions sans réserve %, réserves levées dans le délai %, jalons conformes du premier coup %, commandes libérées sans dérogation %, livraisons à la date promise % (si une date existe). Aucun euro.

### L. Hébergement en ligne

- **L1 U** Adresse du QR de la commande stable, avertissement « adresse locale » à l'impression (même règle que 3.2).
- **L2 O** Lien de consultation du PV côté client, en lecture seule (après l'hébergement).
- **L3 O** Identité authentifiée de la signature de l'entreprise ; droits (qui libère).

### M. Textes, accessibilité

- **M1 E** Messages en faits, jamais en ordres (« Jalon 3 non conforme depuis le… » et non « ne pas passer au jalon suivant ») ; vocabulaire neutre ; « Autre, précisez » sur chaque liste.
- **M2 U** Fenêtres nommées (`aria-labelledby`), focus à l'ouverture et au retour, `role="status"` pour les annonces ; couleur jamais seule.
- **M3 U** Entrées 3.4 au glossaire de l'accueil (jalon, libération, réserve, levée, PV).

---

## 3. Liens avec les autres outils

| Outil | Lien proposé |
|---|---|
| 1.1 Pilotage | Cinq chiffres proposés (K1) ; `deliveriesOf` compte les livraisons (lots comptés une fois). |
| 1.3 Annuaire | Client et réceptionnaire choisis dans l'annuaire, ajout en un tap (C5) ; fiche d'organisation : « N réceptions · X % sans réserve (3.4) ». |
| 2.1 Devis | Commande créée depuis un devis gagné ; client, objet et **date promise** repris ; **plus de montant**. |
| 2.3 Réclamations | Le point d'enquête « Livraison et réception » ouvre **la commande** (pas la racine) ; une réclamation cite le PV. |
| 2.4 Bilan de fin | Inchangé : bilan posé depuis la réception ; le bilan lit la date promise et la date réelle ; la file 3.4 dit « bilan à poser ». |
| 3.2 Instructions | Le point d'un jalon renvoie à la fiche du poste (A11). |
| 3.3 Maintenance | Une panne qui a touché la commande se lit dans la commande ; instruments de mesure (A12). |
| 4.2 Polyvalence | Personnes actives et absences pour les gros boutons ; « peut libérer » (B1). |
| 5.1 Bac rouge | Défaut depuis un jalon **ou une réserve**, un seul lien (`ncId`), retour d'état dans la commande ; le défaut porte `deliveryId`. |
| 5.3 / 5.4 | Réserve ou jalon répété vers un atelier 5 Pourquoi ou un détrompeur (E5). |
| Mes tâches, accueil, agenda | Une tâche par échéance (jalon, libération, PV, levée), triée, avec son jour. |

---

## 4. Architecture proposée (comme 3.2 et 3.3)

- **Domaine** : `src/domain/receptions.ts` (règles, états, réserves, lots, tâches, `takeLife`, journal) et `receptions.test.ts` ; `receptionsExamples.ts` ; `receptionsFeeds.ts` ; le PV (`pvPdf`) quitte `operationsPdf.ts` pour `receptionsPdf.ts` ; **`operations.ts` disparaît** (il ne contient plus que 3.4). Les imports de `tasks.ts`, `status.ts`, `legacyTools.ts` sont mis à jour.
- **Types** (`types.ts`) : `Delivery` étendu, **tous champs facultatifs** (lots, réserves, journal, date promise, `contactId`, `ncId` par jalon…), `ReceptionSettings` (`Params.reception` : délai de levée, jours ouvrés, clause de retenue, motifs de refus, modèles de jalons, personnes qui libèrent), `Params.receptionExampleLevel`, `Nc.deliveryId`.
- **Écrans** (`src/ui/operations/`) : `Receptions.tsx` (écran), `RcQueue.tsx`, `RcCards.tsx`, `RcSheet.tsx` à onglets, `RcMilestone.tsx` (plein écran jalon par QR), `RcReception.tsx` (plein écran chez le client), `RcPv.tsx` (PV écran et impression), `RcPrint.tsx` (fiche suiveuse), `RcNew.tsx` (modèles), `RcSettings.tsx`.
- **Tâches, accueil, rapport** : `tasks.ts`, `status.ts`, `feeds.ts`, `commercialExamples.ts` (retrait de la dépendance), `clients.ts` mis à jour.

---

## 5. Défauts que je prends (dites non à ceux qui ne conviennent pas)

1. **Argent** : option du §1 (règle, délai, dates et clause gardés en mention ; montants et facturation retirés).
2. **Livraisons partielles** : les lots vivent **dans la commande** ; l'ancienne `reception` unique devient la livraison 1 à la lecture.
3. **Libération** : tout le monde peut libérer par défaut ; le réglage « personnes qui libèrent » (vide = tout le monde) est là pour les entreprises qui veulent restreindre, et libérer hors liste se dit en fait.
4. **Signature** : au doigt, facultative pour la libération, attendue pour le client ; repli = photo du PV papier ou mention « client absent / refus de signer ».
5. **PV verrouillé à la signature** ; correction par ligne journalisée.
6. **Aucun nouvel export** ; l'impression du navigateur (fiche suiveuse, PV) et le PDF `pvPdf` existant seulement. Pas d'envoi par e-mail (C12 en option).
7. **Vocabulaire** : « commande » reste (la ligne dit « Commande ou affaire » dans les listes) ; « jalon » reste ; « libération » reste (mot de la norme).
8. **Synchronisation** : les listes de vie restent dans la commande (comme 3.2 et 3.3) ; le découpage en clés ajoutées à la fin est traité avec l'hébergement.
9. **Hors ligne** : non ; **Wake Lock** pendant la réception plein écran : oui.
10. **Pas de tutoiement** : tous les textes à l'infinitif ou en faits.
11. **Tous les niveaux E et U** sont faits ; les O seulement si vous le dites.

## 6. Décision que seul le propriétaire peut prendre

1. **L'argent** (§1) : valider « règle, délai, dates et clause gardés en mention, montants et facturation retirés », ou garder les montants (variante). C'est la seule décision qui change le code.

## 7. Décompte

**E : 44 · U : 28 · O : 6** (78 points, hors liens). Les points E de I (enregistrement) et J (exemples, migration) sont la base ; les points E de A à H font l'outil de terrain.
