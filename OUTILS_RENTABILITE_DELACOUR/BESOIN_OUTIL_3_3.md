# Outil 3.3 « Maintenance » : ce dont une PME a besoin (phase 1)

**Feu vert du 2026-10-06, avec ces décisions : coûts des pannes GARDÉS (le §1 ci-dessous est annulé) ; armoire commune retenue ; impression sans priorité (E11 abandonné, l'affiche QR reste minimale, A4) ; instruments de mesure et contrats dedans ; tous les niveaux (E, U, O) ; phases 2 et 3 par une équipe d'agents.**

Établi le 2026-10-06 après lecture de tout le code de 3.3 et du modèle 3.2. **Rien n'est codé.** Ce document attend le feu vert avant la phase 2. Niveaux : **E** essentiel (sans lui l'outil ne tient pas sur le terrain), **U** utile, **O** option (à retirer sans regret si le périmètre est trop gros).

Règles du propriétaire appliquées partout : aucun chiffrage, prix ni marge ; remplir une fois et garder vivant d'un tap ; vocabulaire neutre (nommer l'action, pas le moyen) et listes terminées par « Autre, précisez » ; messages d'alerte = des faits, jamais des ordres ; aucun export PDF ou CSV nouveau ; une seule langue ; exemples fictifs complets avec marqueur propre à 3.3 ; `DESIGN_OUTILS.md` (11 px, pas d'emoji, statut = couleur + libellé, 44 px au toucher) ; code le plus court qui marche.

---

## 0. Ce que fait l'outil aujourd'hui (constats dans le code)

- Un écran de 280 lignes, et **une seule fenêtre « fiche machine »** qui mêle identité, routine, contrôles, pannes et armoire (`Maintenance.tsx`). La logique de 3.3 et 3.4 est dans le même fichier (`operations.ts`, 60 lignes sur 160 pour 3.3). 3 tests pour 3.3.
- **Aucune photo.** Un outil de terrain sans image : ni la photo « un point OK ressemble à ça », ni la photo de l'anomalie, ni la pièce, ni la plaque de la machine.
- **Liens.** Reliés : 1.2 (`riskId`), 1.3 (un seul `contactId`), plan d'actions, tâches, accueil, 2.3 (point d'enquête « équipement »). Non reliés : 3.2 (seul `uncoveredPostes` lit le nom de la machine), 5.1, 3.1, 3.4, 4.2 (absences).
- **Écriture : les gestes de vie se perdent.** Stock − et + (`Maintenance.tsx:259-261`), « Commandée », « Réparée aujourd'hui », « Fait » s'écrivent dans une copie locale et ne sont enregistrés qu'au clic sur « Enregistrer » ; fermer la fenêtre ou perdre l'onglet les perd. Seule l'inspection s'écrit tout de suite. En revanche « Enregistrer » réécrit la machine entière : ouvrir la fiche, laisser un collègue faire sa routine, enregistrer plus tard efface son relevé (même défaut que celui du lot 0 de 3.2).
- **Retraits.** « Supprimer » efface la machine avec ses 12 semaines de relevés, sans annulation (`:91`, `window.confirm`). Retirer un point, une pièce, un contrôle ou une panne : un tap sur une croix de 14 px, sans annuler.
- **Terrain.** La routine est un tableau d'au moins 560 px de large avec des boutons d'environ 24 px de haut et du texte à saisir pour noter ; deux états seulement (OK, anomalie), pas de « à surveiller » ; pas de QR code à la machine (la feuille PDF à afficher se coche sur papier).
- **Règles.** (1) « Inspecté cette semaine » = moins de 7 jours glissants (`operations.ts:47`) : une routine du vendredi vaut pour la semaine du lundi suivant jusqu'au vendredi ; les jours fermés de l'entreprise sont ignorés. (2) Une anomalie est comparée à son point par le libellé (`Maintenance.tsx:98`) : renommer un point en rouvre une seconde. (3) Contrôles périodiques : seule la dernière date est gardée (pas d'historique, pas de rapport), fréquence en jours (182 j ne sont pas 6 mois, 365 j dérivent d'un jour tous les 4 ans), « jamais fait » = échu aujourd'hui, aucune alerte avant l'échéance, aucun « planifié ». (4) Pièces : délai en texte libre (« 3 semaines », incalculable), fournisseur en texte libre, aucune alerte quand la livraison attendue est dépassée, un seul seuil (sous le mini), ni rupture, ni péremption, aucun journal des sorties ; pièces rangées par machine, donc une même courroie sur trois machines a trois stocks.
- **Messages.** Plusieurs sont des ordres : « commander tout de suite, le délai compte », « Traiter avant la casse », « obligation réglementaire » (`operations.ts:72-76`).
- **Vocabulaire d'industrie.** « Machine », « atelier », « copeaux », « glissières ». 2.3 propose déjà « Matériel et engins » et « Outils, logiciels et accès » selon le métier (`commercial.ts:161-186`).

---

## 1. Le champ de coût des pannes, au regard de « pas de chiffrage » (ANNULÉ : le propriétaire garde les coûts)

**Constat.** `Equipment.breakdowns[].cost` (`types.ts:468`) est un montant en euros tapé à la main pour chaque panne (`Maintenance.tsx:236`), additionné par `downtime()` (`operations.ts:29-33`), affiché sous « Pannes » (`Maintenance.tsx:229`) et dans le message « Pannes sur 12 mois » (`operations.ts:78`). L'exemple en met un à 2 400 € (`operationsExamples.ts:32`). Aucun autre outil ne le lit : ni 5.2, ni le tableau de pilotage 1.1, et il n'est pas calculé avec le coût horaire de 5.2. C'est un chiffre libre sans méthode : exactement ce que la règle écarte.

**Proposition.** Le supprimer, avec le total en euros.
- On garde les **heures d'arrêt**, mais mesurées (bouton « à l'arrêt » et « remis en marche »), et on dit l'impact en **faits** : production arrêtée, ralentie ou aucune ; commandes touchées (lien 3.4) ; Plan B déclenché oui ou non.
- Les anciennes valeurs restent dans les données, inutilisées et invisibles (comme les champs comptables supprimés le 2026-10-01).
- Aucun montant dans 3.3. Si un jour le coût d'une panne doit entrer dans la non-qualité, 5.2 existe déjà (défauts chiffrés au coût horaire) : pas ici.

---

## 2. La liste du besoin

### A. La routine au pied de l'équipement

- **A1 E** Mode « Routine » plein écran sur téléphone ou tablette : un point par écran, boutons de 64 px (comme la Station de 3.2), lisible avec des gants, sans clavier.
- **A2 E** Trois états par point : OK, À surveiller, Anomalie. « À surveiller » ne crée rien, revient à la routine suivante, et devient une anomalie s'il revient deux fois de suite (fait affiché).
- **A3 E** Photos : une photo de référence par point (« un point OK ressemble à ça », flèche sur la jauge, repères mini et maxi, retouchable) affichée pendant la routine ; photo de l'anomalie en un tap. Réutiliser `PhotoBox`, `Pic`, `PhotoEditor`.
- **A4 U** Relevé chiffré facultatif pour un point mesurable (pression, niveau) avec bornes fixées une fois ; hors bornes = anomalie d'office ; suite des relevés visible.
- **A5 E** Qui fait la routine : gros boutons parmi les personnes de l'équipement (titulaire, suppléant), jamais de saisie libre ; titulaire absent (absences de 4.2) : la routine passe au suppléant, fait affiché.
- **A6 E** QR code collé sur l'équipement : le scanner ouvre la routine de cet équipement (même mécanisme que 3.2, adresse `#3.3~station:<id>`). Affiche A5, A4 imprimée par le navigateur : QR, points et leurs photos. La feuille PDF actuelle reste telle quelle.
- **A7 E** Rythme choisi par équipement : chaque jour, chaque semaine (jour au choix, lundi par défaut), toutes les 2 semaines, chaque mois ; jours fermés de l'entreprise pris en compte. « Inspecté cette semaine » devient « faite pour la période du … au … ».
- **A8 E** Routine reprise après interruption (téléphone verrouillé, appel) : réponses gardées en brouillon.
- **A9 U** « Rien à signaler » en un tap pour une routine entièrement OK.
- **A10 U** Écran maintenu allumé pendant la routine (Wake Lock, https requis).
- **A11 U** Équipement à l'arrêt ou hors période : routine suspendue, sans retard affiché.
- **A12 O** Visa du responsable sur les anomalies de la période, un tap.

### B. Les anomalies

- **B1 E** Signaler un problème à tout moment, par n'importe qui (QR de l'équipement) : photo, nature dans une liste modifiable (bruit, fuite, chaleur, vibration, sécurité, Autre précisez), gravité en 3 gros boutons (tourne mal, à l'arrêt, danger).
- **B2 E** Cycle visible : signalée, prise en charge (par qui, pour quand), en attente (pièce, prestataire), réparée, vérifiée à la routine suivante. Une anomalie ne se ferme pas seule : la vérification est le point OK qui suit.
- **B3 E** Anomalie liée à son point par identifiant (renommer un point n'en ouvre plus une seconde).
- **B4 E** Gravité « danger » : fait en rouge, visible à l'accueil et dans Mes tâches, personne désignée.
- **B5 U** Lien avec le bac rouge (5.1) : le défaut porte l'équipement concerné (`equipmentId`, liste dans la fiche défaut) ; la fiche équipement affiche « 3 défauts en 90 jours » dont la cause est outillage ou réglage ; une anomalie peut ouvrir un défaut.
- **B6 U** Même point en anomalie 3 fois en 12 semaines : fait « revenu 3 fois » et bouton vers un atelier 5 Pourquoi (5.3).

### C. Les pannes

- **C1 E** « À l'arrêt » en un tap (l'heure de début s'écrit) et « Remis en marche » (durée calculée). Plus de saisie d'heures.
- **C2 E** Cause dans une liste neutre modifiable : usure normale, casse d'une pièce, entretien ou lubrification, mauvaise manipulation, alimentation (électricité, air, fluide), commande ou électronique, réglage, cause extérieure, Autre précisez.
- **C3 E** Impact en faits : production arrêtée, ralentie ou aucune ; commandes ou lots touchés (liste de 3.4) ; Plan B déclenché oui ou non. Aucun montant.
- **C4 E** Réparation : par qui (interne, constructeur ou SAV, prestataire, Autre précisez) avec son contact de l'annuaire 1.3 ; pièce utilisée prise dans l'armoire (le stock descend seul) ; solution provisoire ou définitive.
- **C5 E** Lien Plan B (1.2) : l'arrêt dépasse l'arrêt toléré du risque relié (`maxOutage`) = fait affiché et ouverture de la fiche réflexe. Équipement sans Plan B = fait (existe déjà).
- **C6 E** Équipement à l'arrêt : statut visible sur la carte, routine suspendue (A11).
- **C7 U** Deux pannes de même cause en 12 mois : fait, avec bouton vers un atelier 5 Pourquoi ou une action.
- **C8 U** Sur 12 mois : nombre de pannes, heures d'arrêt, durée moyenne entre deux pannes. Jamais en euros.

### D. L'armoire de survie

- **D1 E** **Armoire commune** : une liste de pièces pour toute l'entreprise, chaque pièce dit quels équipements elle sert (une courroie sur trois machines = un stock). Les pièces actuelles sont reprises sans perte, fusionnées par référence. *C'est un changement de structure (nouvelle collection `spares`).*
- **D2 E** « J'ai pris une pièce » : un gros bouton −1 qui demande pour quel équipement et quelle anomalie ou panne ; écrit un mouvement daté (qui, quand, pourquoi). « J'ai rangé une pièce » (+1) de même. Les gestes s'écrivent à l'instant.
- **D3 E** Quatre niveaux visibles : au-dessus du mini, au mini, sous le mini, rupture (0). Rupture d'une pièce critique = rouge.
- **D4 E** Commande : « commandée le … (quantité) », « attendue le … », « reçue » (le stock monte de la quantité) ; livraison dépassée = fait (« attendue depuis 9 jours »).
- **D5 E** Délai en nombre de jours ; « 3 semaines » repris en 21 j. Fait calculé avec les mouvements : « livraison en 21 jours, stock pour N semaines au rythme des 12 derniers mois ».
- **D6 E** Fournisseur de la pièce choisi dans 3.1 (fournisseurs et organisations de l'annuaire) avec « Autre, précisez » ; fait si le fournisseur est en classe C ou source unique.
- **D7 E** Photo de la pièce et photo de son rangement (tiroir, étagère), emplacement écrit : la retrouver en 30 secondes en pleine panne.
- **D8 U** Pourquoi elle est critique : « arrête l'équipement si elle casse », « introuvable en moins de N jours », « source unique » ; sert à ne pas confondre pièce critique et consommable.
- **D9 U** Durée de vie ou date limite (joints, batteries, graisses) : fait avant péremption.
- **D10 U** Comptage : « Armoire comptée, rien à signaler » en un tap (date, personne) ; fait si pas comptée depuis 30 jours (réglable) ; un écart devient un mouvement « correction ».
- **D11 U** Qui a la clé : porteur, suppléant, emplacement ; fait si le porteur est absent (4.2) sans suppléant.
- **D12 U** Références équivalentes (constructeur, compatible).
- **D13 O** Consommables dans la même liste, filtre « critiques » par défaut.

### E. Contrôles périodiques et réglementaires

- **E1 E** Historique par contrôle (date, résultat, qui, rapport en photo ou lien) au lieu de la seule dernière date : le certificat se retrouve en deux taps lors d'un audit.
- **E2 E** Fréquence en jours, semaines, mois ou années (« tous les 6 mois » est un vrai mois) ; première échéance saisie à la création (plus d'échéance fabriquée à aujourd'hui).
- **E3 E** États : à planifier, planifié le … (par qui), à échéance dans N jours (préavis réglable, 30 j), échu, fait. Aujourd'hui rien n'alerte avant l'échéance.
- **E4 E** Résultat : conforme, avec observations, non conforme. Les observations sont une liste à lever avec date limite (comme la levée de réserve de 3.4) ; fait si non levées.
- **E5 E** Qui réalise : interne, organisme agréé, prestataire (annuaire 1.3), Autre précisez.
- **E6 E** Catalogue de départ neutre et modifiable dans « Réglages de cet outil » : extincteurs, installations électriques, appareils de levage, équipements sous pression, véhicules et engins, premiers secours et défibrillateur, ventilation et aspiration, étalonnage d'un instrument, Autre précisez. La case « obligatoire » reste celle que l'entreprise coche ; l'outil n'affirme pas la loi. *Justesse réglementaire des périodicités à faire valider.*
- **E7 U** Contrôles d'un lieu et non d'une machine (extincteurs, détection incendie, issues) : type d'équipement « installation ou bâtiment » (F1).
- **E8 U** Instruments de mesure : n° d'identification, étalonnage (date, prochaine, certificat en photo), lien avec le « matériel » des fiches 3.2 (clé dynamométrique). Fait : « à étalonner dans N jours ».
- **E9 U** Contrat de maintenance : prestataire, échéance, délai d'intervention garanti ; fait : « contrat échu dans 45 jours ».
- **E10 U** Journal des interventions préventives (graissage, vidange, remplacement préventif) : ce qui a été fait, par qui, quand.
- **E11 O** Registre des contrôles imprimable par le navigateur pour un audit ou l'inspection du travail. *À valider : encore dans « pas d'export » ?*

### F. La fiche équipement

- **F1 E** « Équipement » et non « machine » : type (machine, véhicule ou engin, installation ou bâtiment, outil informatique, instrument de mesure, Autre précisez), le vocabulaire de l'écran suit. Modèles de routine par type (8 à 10, justesse métier à faire valider), fiche vide ou copie d'un équipement existant.
- **F2 E** Identité : photo de l'équipement, fabricant, modèle, n° de série, année de mise en service, photo de la plaque signalétique (utile pour commander une pièce ou appeler le SAV).
- **F3 E** Documents : notice (photo de la couverture ou lien http(s) validé), schéma, attestation ; où ils se trouvent.
- **F4 E** Statut : en service, à l'arrêt, retiré (vendu, mis au rebut, avec date). On ne supprime pas un équipement qui a un historique : « Retirer du service » ; « Supprimer » seulement si rien n'est perdu.
- **F5 E** Intervenants (plusieurs : constructeur, électricien, dépanneur, organisme de contrôle) : rôle, contact de l'annuaire, appel `tel:` en un tap, horaires ou astreinte, « numéro vérifié il y a N mois ».
- **F6 U** Emplacement et épingle sur le plan de l'atelier de 3.2 (le même plan, un seul endroit pour le changer).
- **F7 U** Groupe (atelier, ligne, site), liste libre comme `group` de 3.2, avec filtre.
- **F8 U** « Goulet » oui ou non (son arrêt bloque l'activité) ; seuls les goulets pèsent dans les chiffres de tête, les autres sont suivis sans rouge.
- **F9 O** Consignes de sécurité d'intervention (consignation, protections, habilitation électrique) en texte et pictogrammes (`Ppe.tsx`), imprimées sur l'affiche.

### G. L'écran principal

- **G1 E** « À faire » en tête : file triée par ton puis échéance (routine du jour, anomalies, pièces à commander, contrôles échus), trois lignes puis « voir les N autres », même forme que la file de 3.2 ; chaque ligne dit quoi et quel équipement.
- **G2 E** Cartes : photo, statut en couleur et libellé, bande des 12 dernières périodes (carrés vert, ambre, rouge, gris avec symbole), responsable, prochaine échéance ; liste compacte sous 640 px.
- **G3 E** Filtres en pastilles avec leur nombre (tous, à faire, anomalies, à l'arrêt, pièces, contrôles, retirés), recherche, groupe.
- **G4 E** Quatre chiffres de tête qui disent la même chose que la carte et la file : routines à jour, anomalies ouvertes, pièces au mini ou en rupture, contrôles échus.
- **G5 U** Vue Plan : épingles des équipements sur le plan, couleur et libellé d'état.
- **G6 U** Vue Armoire : toutes les pièces, filtres critiques, sous le mini, commandées, ± en gros boutons.
- **G7 U** Vue Contrôles : toutes les échéances des 12 prochains mois, par mois, tous équipements.
- **G8 U** État vide et « Voir un exemple traité » refaits ; « Méthode en 3 étapes » refermée.
- **G9 O** Écran « équipement » plein écran sans décor de gestion, pour la tablette fixée à la machine (le même que le QR).

### H. Enregistrement et pertes de données (lot 0 de 3.3, dès la construction)

- **H1 E** Séparer ce que la personne tape (identité, points, seuils, intervenants) de la vie (relevés, anomalies, pannes, mouvements, contrôles faits) : un `takeLife` de 3.3, pour qu'une fiche périmée n'écrase jamais un relevé.
- **H2 E** Chaque geste de vie s'écrit à l'instant : stock − et +, « fait », « commandée », « réparée », routine. Plus de « Enregistrer » pour eux.
- **H3 E** Brouillon à la frappe pour l'identité et les points, écrit aussi à la fermeture, au changement d'outil, quand l'onglet passe en arrière-plan.
- **H4 E** « Retiré · Annuler » de 8 s pour tout retrait (point, pièce, contrôle, intervenant, panne, photo) ; fin de `window.confirm`.
- **H5 E** Cibles de 44 px au toucher partout ; fin des croix de 14 px.
- **H6 E** « Supprimer » seulement quand rien n'est perdu, sinon « Retirer du service ». Aucune perte d'historique.
- **H7 U** Journal global (qui, quand) pour les gestes de vie.
- **H8 U** Reprendre ce que 3.2 a posé contre le retour d'un enregistrement supprimé.

### I. Exemples fictifs, marqueur et migration

- **I1 E** Sept équipements fictifs de types variés (centre d'usinage, presse plieuse, compresseur d'air, chariot élévateur, cabine de peinture, véhicule de livraison, poste informatique ou serveur) montrant **tous les états** : routine à jour, due, en retard, jamais faite ; point à surveiller ; anomalie ouverte avec photo ; équipement à l'arrêt ; pièce au mini, sous le mini, en rupture, commandée en retard, reçue ; contrôle échu, à planifier, planifié, observation à lever ; instrument à étalonner ; contrat qui expire ; équipement retiré. Photos : dessins SVG (comme 3.2).
- **I2 E** Marqueur propre `Params.maintExampleLevel`, mise à niveau sans écraser, bouton « Voir un exemple traité » qui ne remplace rien (`fillEmptyCollections`).
- **I3 E** Vérifier que les exemples ne déclenchent pas d'alerte dans un autre outil (1.1, « postes cités sans instruction » de 3.2 qui lit les noms d'équipements, 5.3).
- **I4 E** Migration : les anciennes données se lisent sans plantage (pièces fusionnées dans l'armoire, `leadTime` texte vers jours, `lastDone` vers premier historique, anomalies d'avant `closedAt`), les valeurs `cost` restent inutilisées.

### J. Textes, ergonomie, accessibilité

- **J1 E** Messages en faits, plus d'ordres (« 2 pièces sous le mini : courroie axe Z, électrovanne » et non « commander tout de suite »). Le « à + infinitif » reste dans la file « À faire » (une tâche), pas dans les messages.
- **J2 E** Vocabulaire neutre ; chaque liste de choix finit par « Autre, précisez » et ouvre un champ.
- **J3 E** 11 px minimum, aucun emoji, statut = couleur + libellé, pluriels avec `plural`, espaces insécables.
- **J4 U** Sur 375 px : sections repliables dans la fiche, titre sur sa ligne, actions dans un menu, photo en premier.
- **J5 U** Fenêtres nommées (`aria-labelledby`), focus à l'ouverture et au retour, annonces `role="status"`.

### K. Chiffres proposés au tableau de pilotage 1.1

- **K1 U** Proposés, **jamais écrits en silence** (FeedBox, rôles `KpiRole` à ajouter) : routines faites à temps, équipements goulets sans anomalie ouverte depuis plus de 7 jours, heures d'arrêt sur 12 mois, contrôles à jour, pièces critiques au-dessus du mini. Une ligne dans le rapport mensuel. Aucun euro.

### L. Hébergement en ligne

- **L1 U** Adresse du QR stable (même règle que 3.2) et avertissement « adresse locale » à l'impression.
- **L2 U** Identité de la routine : les boutons des personnes de l'équipement, puis le compte quand l'hébergement existera.
- **L3 O** Mode hors ligne de l'écran de routine (après l'hébergement).

---

## 3. Liens avec les autres outils

| Outil | Lien proposé |
|---|---|
| 1.1 Pilotage | 5 chiffres proposés (K1), ligne du rapport mensuel. |
| 1.2 Plans B | Arrêt contre arrêt toléré (C5) ; fiche réflexe ouverte depuis la panne ; la fiche du risque liste ses équipements ; « sans Plan B » (existe). |
| 1.3 Annuaire | Intervenants multiples avec appel (F5, C4, E5), « numéro vérifié » ; supprimer un contact ne laisse aucun orphelin (déjà fait pour `contactId`, à étendre). |
| 3.1 Fournisseurs | Fournisseur de la pièce (D6) ; classe C et source unique en faits ; pièce défectueuse = réclamation 3.1 préremplie (option). |
| 3.2 Instructions | `Equipment.sopId` : « Instruction du poste : V03, affichée, N habilités » dans la fiche équipement ; côté 3.2 « équipement révisé depuis la V03 » et « titulaire non habilité » (point 10.5 de la liste 3.2) ; plan partagé (F6). |
| 3.4 Réceptions | Commandes touchées par une panne (C3). |
| 4.2 Polyvalence | Absences pour A5, D11 ; compétence « routine de l'équipement » (option). |
| 5.1 Bac rouge | `equipmentId` sur le défaut (B5) ; anomalie qui ouvre un défaut. |
| 5.3 Ateliers | Anomalie ou panne répétée vers un atelier (B6, C7). |
| 2.3 Réclamations | Le point d'enquête « équipement » choisit l'équipement (aujourd'hui il ouvre la liste). |
| Mes tâches, accueil, agenda | Routine du jour par personne, anomalies, pièce attendue en retard, contrôle planifié à sa date. |

---

## 4. Architecture proposée (comme 3.2)

- **Domaine** : `src/domain/maintenance.ts` (règles, états, tâches, exemples de messages, `takeLife`) et son `maintenance.test.ts` ; `maintenanceExamples.ts` ; `maintenancePdf.ts` (reçoit `routinePdf`) ; `operations.ts` ne garde que 3.4 ; `Params.maintExampleLevel` et un `MaintSettings` (jour de routine, préavis, jours de comptage, causes, catalogue de contrôles).
- **Types** : `Equipment` étendu, tous champs facultatifs (les anciennes données se lisent) ; nouvelle collection `spares` pour l'armoire commune ; photos en références `photo:…`.
- **Écrans** (`src/ui/operations/`) : `Maintenance.tsx` (écran), `EqQueue.tsx` (file « À faire »), `EqCards.tsx`, `EqSheet.tsx` à **5 onglets** (Routine · Anomalies et pannes · Armoire · Contrôles · Fiche), `EqRoutine.tsx` (plein écran terrain, QR), `EqNew.tsx` (modèles), `EqPrint.tsx` (affiche avec QR), `EqSettings.tsx`.
- **Tâches, accueil, rapport** : `tasks.ts` (cas 3.3), `status.ts` (badge), `feeds.ts` (K1) mis à jour.

---

## 5. Défauts que je prends (dites non à ceux qui ne conviennent pas)

1. **Coût des pannes supprimé** (voir §1).
2. **« Équipement » remplace « machine »** dans l'écran ; le titre de l'outil reste « Maintenance », le nom « routine du lundi » reste le rythme par défaut.
3. **Armoire commune** (D1) plutôt que des pièces par équipement.
4. **États de routine** : OK, à surveiller, anomalie.
5. **Aucun export nouveau.** Le PDF actuel de la feuille de routine reste ; l'affiche avec QR passe par l'impression du navigateur.
6. **Plan** : réutiliser celui de 3.2, sans second plan.
7. **Synchronisation** : les listes de vie restent dans l'enregistrement de l'équipement (comme 3.2 à ce jour) ; le découpage en clés ajoutées à la fin (point 11.4 de la liste 3.2) est traité avec l'hébergement, pas ici.
8. **Hors ligne** : non ; **Wake Lock** : oui.
9. **GMAO complète laissée de côté** : pas d'ordres de travail, de nomenclatures, de compteurs d'heures, de planning de charge, de stock valorisé, de rendement de machine.
10. **Catalogue de contrôles réglementaires** : neutre, modifiable, périodicités à faire valider ; l'outil n'affirme pas la loi.

## 6. Décisions que seul le propriétaire peut prendre

1. Confirmer la **suppression du coût des pannes** (§1).
2. **Armoire commune** (changement de structure, reprise automatique des pièces actuelles) ou pièces par équipement (plus simple, stocks en double) ?
3. **Registre des contrôles imprimable** par le navigateur (E11) : dedans ou dehors, même question que le point 3 de la liste 3.2.
4. **Instruments de mesure et contrats** (E8, E9) dans 3.3 ou hors périmètre ? Par défaut dedans, en léger.
5. **Périmètre global** : tout le niveau E et U, ou seulement E d'abord ? Par défaut tout E et U, les O ne sont faits que sur demande.

---

## 7. Décompte

E : 52 · U : 31 · O : 6 (89 points, hors liens). Les points E de H (enregistrement) et I (exemples, migration) sont la base ; les points E de A à G font l'outil de terrain.
